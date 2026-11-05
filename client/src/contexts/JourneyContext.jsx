import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import localDB from '../services/db';

// eslint-disable-next-line react-refresh/only-export-components
export const JourneyContext = createContext(null);

import {
  calculateLocalNightDutyHours,
  calculateLocalTA
} from '../utils/calculations';


export const JourneyProvider = ({ children }) => {
  const { user, isOnline } = useAuth();
  const [journeys, setJourneys] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [reports, setReports] = useState([]);
  const [rules, setRules] = useState({ taDailyRate: 800, ndaHourlyRate: 180 });
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const runOcrUploadPipeline = useCallback(async (photoId, fileBlob) => {
    try {
      await localDB.put('photos', { id: photoId, blob: fileBlob, status: 'uploading' });
      
      const formData = new FormData();
      const file = new File([fileBlob], `slip-${Date.now()}.png`, { type: fileBlob.type });
      formData.append('file', file);

      const uploadResponse = await api.ai.uploadOcr(formData);
      const jobId = uploadResponse.jobId;

      await localDB.put('photos', { 
        id: photoId, 
        blob: fileBlob, 
        status: 'processing', 
        jobId 
      });

      // Poll for job completion status
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await api.ai.checkOcrStatus(jobId);
            
            if (statusRes.status === 'completed') {
              clearInterval(pollInterval);
              await localDB.put('photos', {
                id: photoId,
                blob: fileBlob,
                status: 'completed',
                jobId,
                result: statusRes.result
              });
              resolve({ status: 'completed', result: statusRes.result });
            } else if (statusRes.status === 'failed') {
              clearInterval(pollInterval);
              await localDB.put('photos', {
                id: photoId,
                blob: fileBlob,
                status: 'failed',
                jobId,
                error: statusRes.error
              });
              reject(new Error(statusRes.error || 'AI OCR parsing failed.'));
            } else if (attempts > 30) {
              clearInterval(pollInterval);
              await localDB.put('photos', {
                id: photoId,
                blob: fileBlob,
                status: 'failed',
                jobId,
                error: 'Polling timeout exceeded.'
              });
              reject(new Error('AI OCR parsing timed out.'));
            }
          } catch (err) {
            clearInterval(pollInterval);
            reject(err);
          }
        }, 1500);
      });
    } catch (error) {
      await localDB.put('photos', {
        id: photoId,
        blob: fileBlob,
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      await localDB.init();
      
      // Load Allowance Rules first (cache or server)
      if (isOnline) {
        try {
          const ruleData = await api.rules.get();
          setRules(ruleData);
          await localDB.put('rules', ruleData);
        } catch (err) {
          console.error('Failed to get rules from server:', err);
          const cachedRules = await localDB.get('rules', user?.role);
          if (cachedRules) setRules(cachedRules);
        }
      } else {
        const cachedRules = await localDB.get('rules', user?.role);
        if (cachedRules) setRules(cachedRules);
      }

      // Cache Trains offline
      if (isOnline) {
        try {
          const allTrains = await api.trains.search('');
          await localDB.clear('trains');
          for (const train of allTrains) {
            await localDB.put('trains', train);
          }
        } catch (err) {
          console.error('Failed to cache trains offline:', err);
        }
      }

      // Load Journeys
      if (isOnline) {
        try {
          const serverJourneys = await api.journeys.getAll();
          const mapped = serverJourneys.map(j => ({ ...j, syncStatus: 'synced' }));
          setJourneys(mapped);
          
          // Clear cached local and overwrite with fresh server data
          const localJourneys = await localDB.getAll('journeys');
          const unsynced = localJourneys.filter(j => j.syncStatus && j.syncStatus !== 'synced');
          
          // Overwrite local db with server data but preserve unsynced modifications
          await localDB.clear('journeys');
          for (const sj of serverJourneys) {
            await localDB.put('journeys', { ...sj, syncStatus: 'synced' });
          }
          // Put unsynced items back in local db
          for (const uj of unsynced) {
            await localDB.put('journeys', uj);
          }
        } catch (err) {
          console.error('Failed to get journeys from server, falling back to cache:', err);
          const localData = await localDB.getAll('journeys');
          setJourneys(localData);
        }
      } else {
        const localData = await localDB.getAll('journeys');
        // Filter out pending_delete items from current views
        setJourneys(localData.filter(j => j.syncStatus !== 'pending_delete'));
      }

      // Load Templates
      if (isOnline) {
        try {
          const temps = await api.templates.getAll();
          setTemplates(temps);
          await localDB.clear('templates');
          for (const t of temps) {
            await localDB.put('templates', { id: t._id, ...t });
          }
        } catch (err) {
          console.log('Failed to fetch templates, loading from cache:', err);
          const cached = await localDB.getAll('templates');
          setTemplates(cached);
        }
      } else {
        const cached = await localDB.getAll('templates');
        setTemplates(cached);
      }

      // Load Reports
      if (isOnline) {
        try {
          const reportsList = await api.reports.getAll();
          setReports(reportsList);
          await localDB.clear('reports');
          for (const r of reportsList) {
            await localDB.put('reports', { id: r._id, ...r });
          }
        } catch (err) {
          console.log('Failed to fetch reports, loading from cache:', err);
          const cached = await localDB.getAll('reports');
          setReports(cached);
        }
      } else {
        const cached = await localDB.getAll('reports');
        setReports(cached);
      }

    } catch (error) {
      console.error('Data loading failed:', error);
    }
  }, [isOnline, user]);

  // Synchronize unsynced offline records with the database
  const syncOfflineData = useCallback(async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    setSyncProgress(10);
    try {
      const localItems = await localDB.getAll('journeys');
      const pendingCreate = localItems.filter(j => j.syncStatus === 'pending_create');
      const pendingUpdate = localItems.filter(j => j.syncStatus === 'pending_update');
      const pendingDelete = localItems.filter(j => j.syncStatus === 'pending_delete');

      const totalOperations = pendingCreate.length + pendingUpdate.length + pendingDelete.length;
      if (totalOperations === 0) {
        setSyncing(false);
        await loadData();
        return;
      }

      setSyncProgress(30);

      // 1. Sync deletes first
      for (const item of pendingDelete) {
        if (item._id) {
          try {
            await api.journeys.delete(item._id);
          } catch (err) {
            console.error('Delete sync failed for item:', item._id, err);
          }
        }
        await localDB.delete('journeys', item.localId);
      }

      setSyncProgress(60);

      // 2. Sync creates and updates
      const pushItems = [...pendingCreate, ...pendingUpdate];
      if (pushItems.length > 0) {
        const syncResponse = await api.journeys.sync(pushItems);
        // Overwrite status in local IndexedDB
        if (syncResponse.success && syncResponse.syncedJourneys) {
          for (const sj of syncResponse.syncedJourneys) {
            await localDB.put('journeys', { ...sj, syncStatus: 'synced' });
          }
        }
      }

      setSyncProgress(90);

      // 3. Reload everything
      await loadData();
      
      // 4. Sync pending photos queue (Binary Blobs)
      try {
        const offlinePhotos = await localDB.getAll('photos');
        const pendingPhotos = offlinePhotos.filter(p => p.status === 'pending_upload' || p.status === 'retry_pending');
        for (const p of pendingPhotos) {
          await runOcrUploadPipeline(p.id, p.blob);
        }
      } catch (photoErr) {
        console.error('Failed to sync offline photos queue:', photoErr);
      }
      
      // Try to sync profile updates if any
      const pendingProfile = await localDB.get('profile', 'pending_profile_update');
      if (pendingProfile) {
        delete pendingProfile.key;
        await api.auth.updateProfile(pendingProfile);
        await localDB.delete('profile', 'pending_profile_update');
      }

      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 1000);
    } catch (err) {
      console.error('Sync failed:', err);
      try {
        await loadData();
      } catch (loadErr) {
        console.error('Load data after sync failure failed:', loadErr);
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing, isOnline, loadData, runOcrUploadPipeline]);

  // Unified data initialization flow: Sync offline data first if online, then load everything
  useEffect(() => {
    let active = true;
    if (!user) {
      Promise.resolve().then(() => {
        if (active) {
          setJourneys([]);
          setTemplates([]);
          setReports([]);
          setLoading(false);
        }
      });
      return;
    }

    const initData = async () => {
      setLoading(true);
      try {
        await localDB.init();
        if (!active) return;
        if (isOnline) {
          await syncOfflineData();
        } else {
          await loadData();
        }
      } catch (err) {
        console.error('Failed to initialize data:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    initData();

    return () => {
      active = false;
    };
  }, [user, isOnline, syncOfflineData, loadData]);

  // Create Journey
  const createJourney = async (journeyData) => {
    const localId = `journey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const nightDutyHours = calculateLocalNightDutyHours(journeyData.actualDeparture, journeyData.actualArrival);
    const ndaAmount = nightDutyHours * rules.ndaHourlyRate;

    const taStart = journeyData.departureFromHq || journeyData.actualDeparture;
    const taEnd = journeyData.arrivalAtHq || journeyData.actualArrival;
    const taAmount = calculateLocalTA(taStart, taEnd, rules.taDailyRate);

    const newJourney = {
      ...journeyData,
      localId,
      nightDutyHours,
      ndaAmount,
      taAmount,
      syncStatus: 'pending_create'
    };

    if (isOnline) {
      try {
        const serverSaved = await api.journeys.create({ ...newJourney, syncStatus: 'synced' });
        const savedItem = { ...serverSaved, syncStatus: 'synced' };
        await localDB.put('journeys', savedItem);
        setJourneys(prev => [savedItem, ...prev]);
        return savedItem;
      } catch (err) {
        console.error('Online create failed, caching offline:', err);
      }
    }

    // Save offline
    await localDB.put('journeys', newJourney);
    setJourneys(prev => [newJourney, ...prev]);
    return newJourney;
  };

  // Update Journey
  const updateJourney = async (localId, journeyData) => {
    const current = await localDB.get('journeys', localId);
    if (!current) throw new Error('Journey not found locally');

    const nightDutyHours = calculateLocalNightDutyHours(journeyData.actualDeparture || current.actualDeparture, journeyData.actualArrival || current.actualArrival);
    const ndaAmount = nightDutyHours * rules.ndaHourlyRate;

    const taStart = journeyData.departureFromHq || journeyData.actualDeparture || current.departureFromHq || current.actualDeparture;
    const taEnd = journeyData.arrivalAtHq || journeyData.actualArrival || current.arrivalAtHq || current.actualArrival;
    const taAmount = calculateLocalTA(taStart, taEnd, rules.taDailyRate);

    const updatedItem = {
      ...current,
      ...journeyData,
      nightDutyHours,
      ndaAmount,
      taAmount,
      syncStatus: current.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update'
    };

    if (isOnline && current._id) {
      try {
        const serverUpdated = await api.journeys.update(current._id, { ...updatedItem, syncStatus: 'synced' });
        const savedItem = { ...serverUpdated, syncStatus: 'synced' };
        await localDB.put('journeys', savedItem);
        setJourneys(prev => prev.map(j => j.localId === localId ? savedItem : j));
        return savedItem;
      } catch (err) {
        console.error('Online update failed, caching offline update:', err);
      }
    }

    // Save offline
    await localDB.put('journeys', updatedItem);
    setJourneys(prev => prev.map(j => j.localId === localId ? updatedItem : j));
    return updatedItem;
  };

  // Delete Journey
  const deleteJourney = async (localId) => {
    const current = await localDB.get('journeys', localId);
    if (!current) return;

    if (current.syncStatus === 'pending_create') {
      // Never went to server, delete directly
      await localDB.delete('journeys', localId);
      setJourneys(prev => prev.filter(j => j.localId !== localId));
    } else {
      // Mark as pending delete for sync
      const deletedItem = { ...current, syncStatus: 'pending_delete' };
      await localDB.put('journeys', deletedItem);
      setJourneys(prev => prev.filter(j => j.localId !== localId));

      if (isOnline && current._id) {
        try {
          await api.journeys.delete(current._id);
          await localDB.delete('journeys', localId);
        } catch (err) {
          console.error('Online delete failed, marked for offline deletion:', err);
        }
      }
    }
  };

  // Add Journey Template
  const saveTemplate = async (templateData) => {
    const id = `template-${Date.now()}`;
    const newTemplate = { ...templateData, id };
    
    await localDB.put('templates', newTemplate);
    setTemplates(prev => [...prev, newTemplate]);

    if (isOnline) {
      try {
        const saved = await api.templates.create(templateData);
        // Replace local temp ID with MongoDB _id
        await localDB.delete('templates', id);
        const final = { id: saved._id, ...saved };
        await localDB.put('templates', final);
        setTemplates(prev => prev.map(t => t.id === id ? final : t));
      } catch (err) {
        console.error('Save template to server failed:', err);
      }
    }
  };

  // Delete Journey Template
  const deleteTemplate = async (id) => {
    await localDB.delete('templates', id);
    setTemplates(prev => prev.filter(t => t.id !== id));

    if (isOnline && id.startsWith('template-') === false) { // True server ID
      try {
        await api.templates.delete(id);
      } catch (err) {
        console.error('Delete template from server failed:', err);
      }
    }
  };

  // Archive generated report
  const saveReportToHistory = async (reportData) => {
    const id = `report-${Date.now()}`;
    const localReport = { ...reportData, id };
    await localDB.put('reports', localReport);
    setReports(prev => [localReport, ...prev]);

    if (isOnline) {
      try {
        const serverReport = await api.reports.create(reportData);
        const final = { id: serverReport._id, ...serverReport };
        await localDB.delete('reports', id);
        await localDB.put('reports', final);
        setReports(prev => prev.map(r => r.id === id ? final : r));
      } catch (err) {
        console.error('Online save report failed, saved locally:', err);
      }
    }
  };


  const uploadDutySlip = async (fileBlob) => {
    const photoId = `photo-${Date.now()}`;
    
    // Cache raw binary Blob locally
    await localDB.put('photos', {
      id: photoId,
      blob: fileBlob,
      status: isOnline ? 'uploading' : 'pending_upload',
      jobId: null,
      result: null,
      error: null
    });

    if (!isOnline) {
      return { status: 'cached_offline', photoId };
    }

    return await runOcrUploadPipeline(photoId, fileBlob);
  };

  const parseVoiceTranscript = async (transcript) => {
    if (!isOnline) {
      throw new Error('Voice command parsing requires an internet connection.');
    }
    return await api.ai.parseVoice(transcript);
  };

  const runAuditReport = async (month) => {
    if (!isOnline) {
      // Deterministic client fallback rules
      const list = journeys.filter(j => j.scheduledDeparture.substring(0, 7) === month);
      const warnings = [];
      list.forEach((item, idx) => {
        const dep = new Date(item.actualDeparture);
        const arr = new Date(item.actualArrival);
        if (arr <= dep) {
          warnings.push({ type: 'NEGATIVE_DURATION', trainNumber: item.trainNumber, description: `Train ${item.trainNumber} has negative shift duration.` });
        }
        if (idx > 0 && list[idx - 1].arrivalStation !== item.departureStation) {
          warnings.push({ type: 'STATION_SEQUENCE_MISMATCH', trainNumber: item.trainNumber, description: `Transit sequence gap at station ${item.departureStation}.` });
        }
      });
      return {
        month,
        healthScore: Math.max(100 - (warnings.length * 15), 0),
        journeyCount: list.length,
        warnings,
        aiExplanation: "Offline Mode: Rules ran locally. AI explanation will update once you reconnect."
      };
    }
    return await api.ai.runAudit(month);
  };

  const askCopilot = async (query) => {
    if (!isOnline) {
      return {
        answer: "I am running offline and cannot call my model. However, I can see you have logged " + journeys.length + " journeys on this device.",
        action: 'NONE',
        params: {}
      };
    }
    return await api.ai.chat(query);
  };

  return (
    <JourneyContext.Provider value={{
      journeys,
      templates,
      reports,
      rules,
      syncing,
      syncProgress,
      loading,
      createJourney,
      updateJourney,
      deleteJourney,
      saveTemplate,
      deleteTemplate,
      saveReportToHistory,
      uploadDutySlip,
      parseVoiceTranscript,
      runAuditReport,
      askCopilot,
      triggerManualSync: syncOfflineData
    }}>
      {children}
    </JourneyContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useJourneys = () => useContext(JourneyContext);
