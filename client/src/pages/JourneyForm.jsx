import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useJourneys } from '../contexts/JourneyContext';
import { api } from '../services/api';
import localDB from '../services/db';
import StationAutocomplete from '../components/StationAutocomplete';
import { matchStation, batchMatchStations } from '../utils/stationMatcher';
import { 
  Camera, 
  Upload, 
  Mic, 
  MicOff, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Clock,
  MapPin,
  Navigation
} from 'lucide-react';

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const tzoffset = date.getTimezoneOffset() * 60000;
  return (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
};

const JourneyForm = () => {
  const { id } = useParams(); // localId in offline mode
  const navigate = useNavigate();
  const { createJourney, updateJourney, saveTemplate, uploadDutySlip } = useJourneys();

  const isEditMode = !!id;

  // Form states
  const [trainNumber, setTrainNumber] = useState('');
  const [trainName, setTrainName] = useState('');
  const [departureStation, setDepartureStation] = useState('');
  const [arrivalStation, setArrivalStation] = useState('');
  const [scheduledDeparture, setScheduledDeparture] = useState('');
  const [scheduledArrival, setScheduledArrival] = useState('');
  const [actualDeparture, setActualDeparture] = useState('');
  const [actualArrival, setActualArrival] = useState('');
  const [departureFromHq, setDepartureFromHq] = useState('');
  const [arrivalAtHq, setArrivalAtHq] = useState('');
  const [distanceKm, setDistanceKm] = useState('0');
  const [delayMinutes, setDelayMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  
  // MR (Money Remittance) states
  const [mrNumber, setMrNumber] = useState('');
  const [mrAmount, setMrAmount] = useState('');
  const [remittedAtStation, setRemittedAtStation] = useState('');
  const [hasClaim, setHasClaim] = useState(true);
  
  // Claim Status & Duty Category states (Feature 03)
  const [noClaimReason, setNoClaimReason] = useState('NONE');
  const [dutyCategory, setDutyCategory] = useState('TICKET_CHECKING');
  const [ndaEligible, setNdaEligible] = useState(true);
  
  // Template states
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Autocomplete states
  const [trainSuggestions, setTrainSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // AI OCR States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState('');
  const [ocrRawResult, setOcrRawResult] = useState(null); // Feature 08: full result for confidence review
  const [confidenceScores, setConfidenceScores] = useState({});
  
  // Feature 12 Phase 2: OCR Station Matching
  const [ocrStationMatches, setOcrStationMatches] = useState({
    departureStation: null,
    arrivalStation: null,
    remittedAtStation: null
  });

  // Voice Logging States
  const [isNotesListening, setIsNotesListening] = useState(false);
  const notesRecognitionRef = useRef(null);

  // Feature 09: AI Voice Duty Logging States
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceExtractedFields, setVoiceExtractedFields] = useState([]);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const voiceRecognitionRef = useRef(null);

  // Load journey data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const loadJourney = async () => {
        try {
          await localDB.init();
          const journey = await localDB.get('journeys', id);
          if (journey) {
            setTrainNumber(journey.trainNumber);
            setTrainName(journey.trainName);
            setDepartureStation(journey.departureStation);
            setArrivalStation(journey.arrivalStation);
            setScheduledDeparture(formatDateForInput(journey.scheduledDeparture));
            setScheduledArrival(formatDateForInput(journey.scheduledArrival));
            setActualDeparture(formatDateForInput(journey.actualDeparture));
            setActualArrival(formatDateForInput(journey.actualArrival));
            setDepartureFromHq(journey.departureFromHq ? formatDateForInput(journey.departureFromHq) : '');
            setArrivalAtHq(journey.arrivalAtHq ? formatDateForInput(journey.arrivalAtHq) : '');
            setDistanceKm(journey.distanceKm.toString());
            setDelayMinutes(journey.delayMinutes.toString());
            setNotes(journey.notes || '');
            
            // Load MR fields if present
            setMrNumber(journey.mrNumber || '');
            setMrAmount(journey.mrAmount ? journey.mrAmount.toString() : '');
            setRemittedAtStation(journey.remittedAtStation || '');
            setHasClaim(journey.hasClaim !== undefined ? journey.hasClaim : true);
            
            // Load Claim Status & Duty Category fields
            setNoClaimReason(journey.noClaimReason || 'NONE');
            setDutyCategory(journey.dutyCategory || 'TICKET_CHECKING');
            setNdaEligible(journey.ndaEligible !== undefined ? journey.ndaEligible : true);
          }
        } catch (err) {
          console.error('Failed to load journey for edit:', err);
        }
      };
      loadJourney();
    }
  }, [id, isEditMode]);

  // Voice recognition init for Notes field
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onstart = () => setIsNotesListening(true);
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setNotes(prev => prev ? (prev + ' ' + transcript) : transcript);
      };
      rec.onerror = () => setIsNotesListening(false);
      rec.onend = () => setIsNotesListening(false);

      notesRecognitionRef.current = rec;
    }
  }, []);

  // Feature 09: Voice recognition init for full duty logging
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const voiceRec = new SpeechRecognition();
      voiceRec.continuous = false;
      voiceRec.interimResults = false;
      voiceRec.lang = 'en-IN';

      voiceRec.onstart = () => {
        setIsVoiceRecording(true);
        setVoiceError('');
      };
      voiceRec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setIsVoiceRecording(false);
        // Auto-process transcript with AI
        handleVoiceExtraction(transcript);
      };
      voiceRec.onerror = (event) => {
        setIsVoiceRecording(false);
        setVoiceError('Speech recognition error: ' + event.error);
      };
      voiceRec.onend = () => {
        setIsVoiceRecording(false);
      };

      voiceRecognitionRef.current = voiceRec;
    }
  }, []);

  const handleNotesVoiceClick = () => {
    if (!notesRecognitionRef.current) {
      alert('Voice dictation is not supported in this browser. Try Google Chrome.');
      return;
    }
    if (isNotesListening) {
      notesRecognitionRef.current.stop();
    } else {
      notesRecognitionRef.current.start();
    }
  };

  // Feature 09: Voice modal handlers
  const handleOpenVoiceModal = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice recording is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    setShowVoiceModal(true);
    setVoiceTranscript('');
    setVoiceExtractedFields([]);
    setVoiceError('');
  };

  const handleStartVoiceRecording = () => {
    if (!voiceRecognitionRef.current) return;
    setVoiceTranscript('');
    setVoiceExtractedFields([]);
    setVoiceError('');
    voiceRecognitionRef.current.start();
  };

  const handleStopVoiceRecording = () => {
    if (!voiceRecognitionRef.current) return;
    voiceRecognitionRef.current.stop();
  };

  const handleVoiceExtraction = async (transcript) => {
    setVoiceProcessing(true);
    setVoiceError('');
    try {
      const response = await api.ai.parseVoice({ transcript });
      const extractedFields = response.updates || [];
      
      // Feature 12 Phase 2: Match station fields against directory
      const enrichedFields = await Promise.all(
        extractedFields.map(async (item) => {
          if (item.field === 'departureStation' || item.field === 'arrivalStation' || item.field === 'remittedAtStation') {
            if (item.value && typeof item.value === 'string') {
              const match = await matchStation(item.value, navigator.onLine);
              return {
                ...item,
                stationMatch: match,
                originalValue: item.value
              };
            }
          }
          return item;
        })
      );
      
      setVoiceExtractedFields(enrichedFields);
    } catch (err) {
      setVoiceError(err.message || 'Failed to extract fields from transcript');
    } finally {
      setVoiceProcessing(false);
    }
  };

  const handleApplyVoiceFields = () => {
    voiceExtractedFields.forEach(({ field, value, stationMatch, confirmedStation }) => {
      // Feature 12 Phase 2: Use confirmed station code if available
      if (field === 'departureStation' || field === 'arrivalStation' || field === 'remittedAtStation') {
        const stationValue = confirmedStation ? confirmedStation.code : value;
        
        switch (field) {
          case 'departureStation': setDepartureStation(stationValue); break;
          case 'arrivalStation': setArrivalStation(stationValue); break;
          case 'remittedAtStation': setRemittedAtStation(stationValue); break;
          default: break;
        }
        return;
      }
      
      // Apply non-station fields normally
      switch (field) {
        case 'trainNumber': setTrainNumber(value); break;
        case 'trainName': setTrainName(value); break;
        case 'scheduledDeparture': setScheduledDeparture(formatDateForInput(value)); break;
        case 'scheduledArrival': setScheduledArrival(formatDateForInput(value)); break;
        case 'actualDeparture': setActualDeparture(formatDateForInput(value)); break;
        case 'actualArrival': setActualArrival(formatDateForInput(value)); break;
        case 'departureFromHq': setDepartureFromHq(formatDateForInput(value)); break;
        case 'arrivalAtHq': setArrivalAtHq(formatDateForInput(value)); break;
        case 'distanceKm': setDistanceKm(String(value)); break;
        case 'delayMinutes': setDelayMinutes(String(value)); break;
        case 'dutyCategory': setDutyCategory(value); break;
        case 'hasClaim': setHasClaim(value); break;
        case 'noClaimReason': setNoClaimReason(value); break;
        case 'ndaEligible': setNdaEligible(value); break;
        case 'mrNumber': setMrNumber(value); break;
        case 'mrAmount': setMrAmount(String(value)); break;
        case 'notes': setNotes(prev => prev ? (prev + ' ' + value) : value); break;
        default: break;
      }
    });
    setShowVoiceModal(false);
  };

  // Feature 12 Phase 2: Voice Station Match Handlers
  const handleConfirmVoiceStation = (index, station) => {
    setVoiceExtractedFields(prev => 
      prev.map((item, idx) => 
        idx === index 
          ? { ...item, confirmedStation: station, value: station.code }
          : item
      )
    );
  };

  const handleKeepVoiceText = (index) => {
    setVoiceExtractedFields(prev =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, confirmedStation: null, keepOriginal: true }
          : item
      )
    );
  };

  // OCR Image Upload Handler
  const handleOcrFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError('');
    setOcrSuccessMsg('');

    try {
      const response = await uploadDutySlip(file);

      if (response.status === 'cached_offline') {
        setOcrSuccessMsg('Offline Mode: Photo saved locally. Data extraction will process when online.');
      } else if (response.status === 'completed' && response.result) {
        const res = response.result;

        // Feature 08: Store raw result for the confidence review panel
        setOcrRawResult(res);

        // Auto-fill high-confidence fields (≥80%)
        if (res.trainNumber_confidence >= 80) setTrainNumber(res.trainNumber || '');
        if (res.trainName_confidence >= 80) setTrainName(res.trainName || '');
        
        // Feature 12 Phase 2: Match station names before auto-filling
        const stationsToMatch = {};
        if (res.departureStation) stationsToMatch.departureStation = res.departureStation;
        if (res.arrivalStation) stationsToMatch.arrivalStation = res.arrivalStation;
        if (res.remittedAtStation) stationsToMatch.remittedAtStation = res.remittedAtStation;

        const stationMatchResults = await batchMatchStations(stationsToMatch, navigator.onLine);
        setOcrStationMatches(stationMatchResults);

        // Auto-fill stations based on match confidence
        if (res.departureStation && res.departureStation_confidence >= 80) {
          const match = stationMatchResults.departureStation;
          if (match && (match.type === 'exact' || match.type === 'single')) {
            setDepartureStation(match.station.code); // Use station code for high-confidence matches
          } else {
            setDepartureStation(res.departureStation); // Keep extracted text for review
          }
        }

        if (res.arrivalStation && res.arrivalStation_confidence >= 80) {
          const match = stationMatchResults.arrivalStation;
          if (match && (match.type === 'exact' || match.type === 'single')) {
            setArrivalStation(match.station.code);
          } else {
            setArrivalStation(res.arrivalStation);
          }
        }

        if (res.remittedAtStation && res.remittedAtStation_confidence >= 80) {
          const match = stationMatchResults.remittedAtStation;
          if (match && (match.type === 'exact' || match.type === 'single')) {
            setRemittedAtStation(match.station.code);
          } else {
            setRemittedAtStation(res.remittedAtStation);
          }
        }

        if (res.scheduledDeparture_confidence >= 80) setScheduledDeparture(formatDateForInput(res.scheduledDeparture));
        if (res.scheduledArrival_confidence >= 80) setScheduledArrival(formatDateForInput(res.scheduledArrival));
        if (res.actualDeparture_confidence >= 80) setActualDeparture(formatDateForInput(res.actualDeparture));
        if (res.actualArrival_confidence >= 80) setActualArrival(formatDateForInput(res.actualArrival));
        if (res.distanceKm_confidence >= 80) setDistanceKm((res.distanceKm || 0).toString());

        // Feature 08: Pre-fill medium-confidence fields (50–79%) — user must confirm visually
        if (res.trainNumber_confidence >= 50 && res.trainNumber_confidence < 80 && res.trainNumber) setTrainNumber(res.trainNumber);
        if (res.trainName_confidence >= 50 && res.trainName_confidence < 80 && res.trainName) setTrainName(res.trainName);
        
        if (res.departureStation_confidence >= 50 && res.departureStation_confidence < 80 && res.departureStation) {
          const match = stationMatchResults.departureStation;
          if (match && match.type === 'exact') {
            setDepartureStation(match.station.code);
          } else {
            setDepartureStation(res.departureStation);
          }
        }
        
        if (res.arrivalStation_confidence >= 50 && res.arrivalStation_confidence < 80 && res.arrivalStation) {
          const match = stationMatchResults.arrivalStation;
          if (match && match.type === 'exact') {
            setArrivalStation(match.station.code);
          } else {
            setArrivalStation(res.arrivalStation);
          }
        }

        setConfidenceScores({
          trainNumber: res.trainNumber_confidence,
          trainName: res.trainName_confidence,
          departureStation: res.departureStation_confidence,
          arrivalStation: res.arrivalStation_confidence,
          scheduledDeparture: res.scheduledDeparture_confidence,
          scheduledArrival: res.scheduledArrival_confidence,
          actualDeparture: res.actualDeparture_confidence,
          actualArrival: res.actualArrival_confidence,
          distanceKm: res.distanceKm_confidence,
          coach: res.coach_confidence
        });

        const lowConfFields = Object.entries({
          'Train No': res.trainNumber_confidence,
          'Train Name': res.trainName_confidence,
          'From': res.departureStation_confidence,
          'To': res.arrivalStation_confidence,
          'Dep Time': res.scheduledDeparture_confidence,
          'Arr Time': res.scheduledArrival_confidence,
        }).filter(([_k, v]) => v > 0 && v < 80).map(([k]) => k);

        setOcrSuccessMsg(
          `AI scan complete! ${lowConfFields.length > 0 ? `Verify fields: ${lowConfFields.join(', ')} (low confidence — highlighted in orange)` : 'All fields extracted with high confidence.'}`
        );
      }
    } catch (err) {
      setOcrError(err.message || 'Failed to extract text from duty slip.');
    } finally {
      setOcrLoading(false);
    }
  };

  const searchLocalTrains = async (query) => {
    try {
      await localDB.init();
      const allTrains = await localDB.getAll('trains');
      const lowerQuery = query.toLowerCase();
      return allTrains.filter(t => 
        (t.number && t.number.toLowerCase().includes(lowerQuery)) || 
        (t.name && t.name.toLowerCase().includes(lowerQuery))
      ).slice(0, 10);
    } catch (err) {
      console.error('Local DB search failed:', err);
      return [];
    }
  };

  // Autocomplete search trigger
  useEffect(() => {
    if (trainNumber.length >= 2 && !isEditMode) {
      const fetchSuggestions = async () => {
        try {
          let results = [];
          if (navigator.onLine) {
            try {
              results = await api.trains.search(trainNumber);
            } catch (netErr) {
              console.log('Online fetch failed, falling back to local DB:', netErr);
              results = await searchLocalTrains(trainNumber);
            }
          } else {
            results = await searchLocalTrains(trainNumber);
          }
          setTrainSuggestions(results);
        } catch (err) {
          console.log('Error autocomplete trains:', err);
        }
      };

      const delayDebounce = setTimeout(() => {
        fetchSuggestions();
      }, 300);

      return () => clearTimeout(delayDebounce);
    }
  }, [trainNumber, isEditMode]);

  const updateDelay = (schedStr, actStr) => {
    if (schedStr && actStr) {
      const sched = new Date(schedStr);
      const act = new Date(actStr);
      if (!isNaN(sched) && !isNaN(act) && act > sched) {
        const diffMs = act - sched;
        const diffMins = Math.round(diffMs / (1000 * 60));
        setDelayMinutes(diffMins.toString());
        return;
      }
    }
    setDelayMinutes('0');
  };

  const handleScheduledArrivalChange = (val) => {
    setScheduledArrival(val);
    updateDelay(val, actualArrival);
  };

  const handleActualDepartureChange = (val) => {
    setActualDeparture(val);
    setDepartureFromHq(prev => prev || val);
  };

  const handleActualArrivalChange = (val) => {
    setActualArrival(val);
    setArrivalAtHq(prev => prev || val);
    updateDelay(scheduledArrival, val);
  };

  const handleSelectTrain = (train) => {
    setTrainNumber(train.number);
    setTrainName(train.name);
    setDepartureStation(train.fromStation);
    setArrivalStation(train.toStation);
    if (train.distanceKm) {
      setDistanceKm(train.distanceKm.toString());
    } else {
      setDistanceKm('0');
    }
    setShowSuggestions(false);
  };

  // Feature 12 Phase 2: OCR Station Match Handlers
  const handleConfirmOcrStation = (fieldName, station) => {
    if (fieldName === 'departureStation') {
      setDepartureStation(station.code);
    } else if (fieldName === 'arrivalStation') {
      setArrivalStation(station.code);
    } else if (fieldName === 'remittedAtStation') {
      setRemittedAtStation(station.code);
    }
    
    // Mark as confirmed
    setOcrStationMatches(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], confirmed: true, selectedStation: station }
    }));
  };

  const handleKeepOcrText = (fieldName) => {
    // Mark as confirmed (keeping original text)
    setOcrStationMatches(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], confirmed: true, keepOriginal: true }
    }));
  };

  const getConfidenceClass = (fieldName) => {
    const score = confidenceScores[fieldName];
    if (!score) return '';
    if (score >= 95) return 'border-success';
    if (score >= 80) return 'border-warning';
    return 'border-danger';
  };

  const renderConfidenceAlert = (fieldName) => {
    const score = confidenceScores[fieldName];
    if (!score) return null;
    if (score >= 95) return <small className="text-success d-flex align-items-center gap-1 mt-1 font-weight-medium" style={{ fontSize: '11px' }}><CheckCircle2 size={11} /> High confidence ({score}%)</small>;
    if (score >= 80) return <small className="text-warning d-flex align-items-center gap-1 mt-1 font-weight-medium" style={{ fontSize: '11px' }}><AlertTriangle size={11} /> Review field ({score}%)</small>;
    return <small className="text-danger d-flex align-items-center gap-1 mt-1 font-weight-medium" style={{ fontSize: '11px' }}><AlertTriangle size={11} /> High uncertainty ({score}%)</small>;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const journeyPayload = {
      trainNumber,
      trainName,
      departureStation,
      arrivalStation,
      scheduledDeparture: new Date(scheduledDeparture).toISOString(),
      scheduledArrival: new Date(scheduledArrival).toISOString(),
      actualDeparture: new Date(actualDeparture).toISOString(),
      actualArrival: new Date(actualArrival).toISOString(),
      departureFromHq: departureFromHq ? new Date(departureFromHq).toISOString() : new Date(actualDeparture).toISOString(),
      arrivalAtHq: arrivalAtHq ? new Date(arrivalAtHq).toISOString() : new Date(actualArrival).toISOString(),
      distanceKm: parseInt(distanceKm) || 0,
      delayMinutes: parseInt(delayMinutes) || 0,
      notes,
      // MR fields
      mrNumber: mrNumber || undefined,
      mrAmount: mrAmount ? parseFloat(mrAmount) : undefined,
      remittedAtStation: remittedAtStation || undefined,
      hasClaim,
      // Claim Status & Duty Category fields (Feature 03)
      noClaimReason,
      dutyCategory,
      ndaEligible
    };

    try {
      if (isEditMode) {
        await updateJourney(id, journeyPayload);
      } else {
        await createJourney(journeyPayload);

        if (saveAsTemplate && templateName) {
          const schedDepTime = scheduledDeparture.split('T')[1];
          const schedArrTime = scheduledArrival.split('T')[1];
          await saveTemplate({
            templateName,
            trainNumber,
            trainName,
            departureStation,
            arrivalStation,
            scheduledDepartureTime: schedDepTime,
            scheduledArrivalTime: schedArrTime
          });
        }
      }
      navigate('/journeys');
    } catch (err) {
      alert('Error saving journey log: ' + err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Back Toolbar */}
      <div className="d-flex align-items-center mb-4">
        <Link to="/journeys" className="btn btn-saas-secondary py-1 px-3 me-3 d-flex align-items-center gap-1 btn-sm">
          <ArrowLeft size={13} />
          <span>Back</span>
        </Link>
        <h2 className="text-white mb-0" style={{ fontSize: '20px' }}>{isEditMode ? 'Edit Duty Log' : 'Log New Shift Duty'}</h2>
      </div>

      {/* Feature 09: AI Voice Duty Logging Button */}
      {!isEditMode && (
        <div className="mb-4">
          <button 
            type="button" 
            onClick={handleOpenVoiceModal}
            className="btn btn-glow-success w-100 py-3 d-flex align-items-center justify-content-center gap-2"
          >
            <Mic size={20} />
            <span className="fw-bold">Log Duty by Voice</span>
          </button>
          <p className="text-secondary-custom text-center small mt-2 mb-0">
            Speak naturally: "I worked train 12951 from Mumbai Central to New Delhi on November 10..."
          </p>
        </div>
      )}

      {/* OCR Drag-Drop Image capture Container Card */}
      {!isEditMode && (
        <div className="card-saas mb-4 border-dashed" style={{ border: '1px dashed var(--border-color)', padding: '24px' }}>
          <div className="text-center">
            <Camera size={32} className="text-secondary-custom mb-2" />
            <h5 className="text-white mb-1" style={{ fontSize: '15px', fontWeight: '600' }}>AI Roster Duty Slip Parser</h5>
            <p className="text-secondary-custom small mb-3" style={{ maxWidth: '380px', margin: '0 auto' }}>
              Upload or snap a picture of your physical sign-on roster. The AI will extract dates, stations, and train schedules.
            </p>
            
            <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap">
              <input 
                type="file" 
                id="dutySlipFile" 
                className="d-none" 
                accept="image/*" 
                capture="environment"
                onChange={handleOcrFileChange}
                disabled={ocrLoading}
              />
              <label htmlFor="dutySlipFile" className="btn btn-glow-primary py-2 px-4 d-inline-flex align-items-center gap-2 m-0 cursor-pointer">
                <Upload size={14} />
                <span>Snap / Upload Slip</span>
              </label>
            </div>

            {ocrLoading && (
              <div className="text-info d-flex align-items-center justify-content-center gap-2 small mt-3">
                <span className="spinner-border spinner-border-sm" role="status"></span>
                <span>Gemini parsing slip in background...</span>
              </div>
            )}
            {ocrSuccessMsg && <div className="text-success small mt-3"><CheckCircle2 size={13} className="me-1 d-inline" /> {ocrSuccessMsg}</div>}
            {ocrError && <div className="text-danger small mt-3"><AlertTriangle size={13} className="me-1 d-inline" /> {ocrError}</div>}
          </div>

          {/* Feature 08: Confidence Review Panel */}
          {ocrRawResult && Object.keys(confidenceScores).some(k => confidenceScores[k] > 0) && (
            <div className="mt-3 pt-3 border-top border-secondary">
              <p className="text-secondary-custom mb-2" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Extraction Confidence</p>
              <div className="d-flex flex-wrap gap-2">
                {[
                  { label: 'Train No', key: 'trainNumber', val: ocrRawResult.trainNumber },
                  { label: 'Train Name', key: 'trainName', val: ocrRawResult.trainName },
                  { label: 'From', key: 'departureStation', val: ocrRawResult.departureStation },
                  { label: 'To', key: 'arrivalStation', val: ocrRawResult.arrivalStation },
                  { label: 'Sch Dep', key: 'scheduledDeparture', val: ocrRawResult.scheduledDeparture },
                  { label: 'Sch Arr', key: 'scheduledArrival', val: ocrRawResult.scheduledArrival },
                  { label: 'Act Dep', key: 'actualDeparture', val: ocrRawResult.actualDeparture },
                  { label: 'Act Arr', key: 'actualArrival', val: ocrRawResult.actualArrival },
                  { label: 'Distance', key: 'distanceKm', val: ocrRawResult.distanceKm },
                  { label: 'Coach', key: 'coach', val: ocrRawResult.coach },
                ].filter(f => confidenceScores[f.key] > 0).map(f => {
                  const c = confidenceScores[f.key] || 0;
                  const color = c >= 80 ? 'success' : c >= 50 ? 'warning' : 'danger';
                  return (
                    <div key={f.key} style={{ fontSize: '11px' }} className={`badge bg-${color}-subtle text-${color} border border-${color}-subtle px-2 py-1`}>
                      {f.label}: {f.val || '-'} ({c}%)
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Duty Log Form */}
      <div className="card-saas">
        <form onSubmit={handleSubmit}>
          
          {/* Section: Train Info */}
          <div className="d-flex align-items-center gap-2 mb-3 border-bottom border-secondary pb-2">
            <MapPin size={16} className="text-primary" />
            <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Duty Information</h5>
          </div>
          
          <div className="row g-3 mb-4">
            {/* Train Number */}
            <div className="col-12 col-md-4 position-relative">
              <label className="form-label-saas">Train Number *</label>
              <input
                type="text"
                className={`form-control form-control-saas ${getConfidenceClass('trainNumber')}`}
                placeholder="e.g. 12951"
                value={trainNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  setTrainNumber(val);
                  setShowSuggestions(true);
                  if (val.length < 2) {
                    setTrainSuggestions([]);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                required
                disabled={isEditMode}
              />
              {renderConfidenceAlert('trainNumber')}
              
              {/* Autocomplete Suggestions Panel */}
              {showSuggestions && trainSuggestions.length > 0 && (
                <div className="autocomplete-suggestions">
                  {trainSuggestions.map((t) => (
                    <div 
                      key={t.number} 
                      className="autocomplete-item"
                      onClick={() => handleSelectTrain(t)}
                    >
                      <strong>{t.number}</strong> - {t.name}
                      <small className="text-secondary-custom d-block mt-0.5" style={{ fontSize: '11px' }}>{t.fromStation} → {t.toStation}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Train Name */}
            <div className="col-12 col-md-8">
              <label className="form-label-saas">Train Name *</label>
              <input
                type="text"
                className={`form-control form-control-saas ${getConfidenceClass('trainName')}`}
                placeholder="e.g. Mumbai Rajdhani Express"
                value={trainName}
                onChange={(e) => setTrainName(e.target.value)}
                required
                disabled={isEditMode}
              />
              {renderConfidenceAlert('trainName')}
            </div>

            {/* Route Stations */}
            <div className="col-6">
              <StationAutocomplete
                label="From Station *"
                value={departureStation}
                onChange={(station) => {
                  if (station) {
                    setDepartureStation(station.code);
                  } else {
                    setDepartureStation('');
                  }
                }}
                onInputChange={(text) => setDepartureStation(text)}
                placeholder="Search station..."
                required
                className={getConfidenceClass('departureStation')}
              />
              {renderConfidenceAlert('departureStation')}
              
              {/* Feature 12 Phase 2: OCR Station Match Confirmation */}
              {ocrStationMatches.departureStation && !ocrStationMatches.departureStation.confirmed && 
               ocrStationMatches.departureStation.type === 'ambiguous' && (
                <div className="alert alert-info mt-2 p-2" style={{ fontSize: '12px' }}>
                  <strong>Multiple matches for "{ocrStationMatches.departureStation.originalText}":</strong>
                  <div className="d-flex flex-column gap-1 mt-2">
                    {ocrStationMatches.departureStation.suggestions.map(station => (
                      <button
                        key={station.code}
                        type="button"
                        onClick={() => handleConfirmOcrStation('departureStation', station)}
                        className="btn btn-sm btn-outline-primary text-start d-flex align-items-center justify-content-between"
                      >
                        <span>
                          <strong>{station.code}</strong> - {station.name}
                        </span>
                        {station.zone && (
                          <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '10px' }}>
                            {station.zone}
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeepOcrText('departureStation')}
                      className="btn btn-sm btn-outline-secondary"
                    >
                      Keep "{ocrStationMatches.departureStation.originalText}"
                    </button>
                  </div>
                </div>
              )}
              
              {ocrStationMatches.departureStation && !ocrStationMatches.departureStation.confirmed &&
               ocrStationMatches.departureStation.type === 'unmatched' && (
                <div className="alert alert-warning mt-2 p-2" style={{ fontSize: '11px' }}>
                  <AlertTriangle size={12} className="me-1" />
                  No directory match for "{ocrStationMatches.departureStation.originalText}". Use search or keep text.
                </div>
              )}
            </div>
            <div className="col-6">
              <StationAutocomplete
                label="To Station *"
                value={arrivalStation}
                onChange={(station) => {
                  if (station) {
                    setArrivalStation(station.code);
                  } else {
                    setArrivalStation('');
                  }
                }}
                onInputChange={(text) => setArrivalStation(text)}
                placeholder="Search station..."
                required
                className={getConfidenceClass('arrivalStation')}
              />
              {renderConfidenceAlert('arrivalStation')}
              
              {/* Feature 12 Phase 2: OCR Station Match Confirmation */}
              {ocrStationMatches.arrivalStation && !ocrStationMatches.arrivalStation.confirmed &&
               ocrStationMatches.arrivalStation.type === 'ambiguous' && (
                <div className="alert alert-info mt-2 p-2" style={{ fontSize: '12px' }}>
                  <strong>Multiple matches for "{ocrStationMatches.arrivalStation.originalText}":</strong>
                  <div className="d-flex flex-column gap-1 mt-2">
                    {ocrStationMatches.arrivalStation.suggestions.map(station => (
                      <button
                        key={station.code}
                        type="button"
                        onClick={() => handleConfirmOcrStation('arrivalStation', station)}
                        className="btn btn-sm btn-outline-primary text-start d-flex align-items-center justify-content-between"
                      >
                        <span>
                          <strong>{station.code}</strong> - {station.name}
                        </span>
                        {station.zone && (
                          <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '10px' }}>
                            {station.zone}
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeepOcrText('arrivalStation')}
                      className="btn btn-sm btn-outline-secondary"
                    >
                      Keep "{ocrStationMatches.arrivalStation.originalText}"
                    </button>
                  </div>
                </div>
              )}
              
              {ocrStationMatches.arrivalStation && !ocrStationMatches.arrivalStation.confirmed &&
               ocrStationMatches.arrivalStation.type === 'unmatched' && (
                <div className="alert alert-warning mt-2 p-2" style={{ fontSize: '11px' }}>
                  <AlertTriangle size={12} className="me-1" />
                  No directory match for "{ocrStationMatches.arrivalStation.originalText}". Use search or keep text.
                </div>
              )}
            </div>
          </div>

          {/* Section: Duty Timings */}
          <div className="d-flex align-items-center gap-2 mb-3 border-bottom border-secondary pb-2">
            <Clock size={16} className="text-primary" />
            <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Shift Timings</h5>
          </div>

          <div className="row g-3 mb-4">
            {/* Scheduled Times */}
            <div className="col-12 col-md-6">
              <label className="form-label-saas">Scheduled Departure *</label>
              <input
                type="datetime-local"
                className={`form-control form-control-saas ${getConfidenceClass('scheduledDeparture')}`}
                value={scheduledDeparture}
                onChange={(e) => setScheduledDeparture(e.target.value)}
                required
              />
              {renderConfidenceAlert('scheduledDeparture')}
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label-saas">Scheduled Arrival *</label>
              <input
                type="datetime-local"
                className={`form-control form-control-saas ${getConfidenceClass('scheduledArrival')}`}
                value={scheduledArrival}
                onChange={(e) => handleScheduledArrivalChange(e.target.value)}
                required
              />
              {renderConfidenceAlert('scheduledArrival')}
            </div>

            {/* Actual Times */}
            <div className="col-12 col-md-6">
              <label className="form-label-saas">Actual Departure *</label>
              <input
                type="datetime-local"
                className={`form-control form-control-saas ${getConfidenceClass('actualDeparture')}`}
                value={actualDeparture}
                onChange={(e) => handleActualDepartureChange(e.target.value)}
                required
              />
              {renderConfidenceAlert('actualDeparture')}
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label-saas">Actual Arrival *</label>
              <input
                type="datetime-local"
                className={`form-control form-control-saas ${getConfidenceClass('actualArrival')}`}
                value={actualArrival}
                onChange={(e) => handleActualArrivalChange(e.target.value)}
                required
              />
              {renderConfidenceAlert('actualArrival')}
            </div>
          </div>

          {/* Section: Headquarter Times for TA */}
          <div className="d-flex align-items-center gap-2 mb-3 border-bottom border-secondary pb-2">
            <Navigation size={16} className="text-primary" />
            <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>HQ Absence (For TA Claim Calculation)</h5>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <label className="form-label-saas">Departure from HQ</label>
              <input
                type="datetime-local"
                className="form-control form-control-saas"
                value={departureFromHq}
                onChange={(e) => setDepartureFromHq(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label-saas">Arrival at HQ</label>
              <input
                type="datetime-local"
                className="form-control form-control-saas"
                value={arrivalAtHq}
                onChange={(e) => setArrivalAtHq(e.target.value)}
              />
            </div>
          </div>

          {/* Section: Money Remittance (MR) */}
          <div className="d-flex align-items-center gap-2 mb-3 border-bottom border-secondary pb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Money Remittance (MR)</h5>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <label className="form-label-saas">MR Number</label>
              <input
                type="text"
                className="form-control form-control-saas"
                placeholder="e.g. MR2024001234"
                value={mrNumber}
                onChange={(e) => setMrNumber(e.target.value)}
              />
              <small className="text-secondary-custom" style={{ fontSize: '11px' }}>Unique remittance identifier</small>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label-saas">MR Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-control form-control-saas"
                placeholder="e.g. 5000.00"
                value={mrAmount}
                onChange={(e) => setMrAmount(e.target.value)}
              />
              <small className="text-secondary-custom" style={{ fontSize: '11px' }}>Amount in Indian Rupees</small>
            </div>
            <div className="col-12 col-md-4">
              <StationAutocomplete
                label="Remitted At Station"
                value={remittedAtStation}
                onChange={(station) => {
                  if (station) {
                    setRemittedAtStation(station.code);
                  } else {
                    setRemittedAtStation('');
                  }
                }}
                onInputChange={(text) => setRemittedAtStation(text)}
                placeholder="Search station..."
              />
              <small className="text-secondary-custom" style={{ fontSize: '11px' }}>Station code where MR was processed</small>
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="hasClaim"
                  checked={hasClaim}
                  onChange={(e) => setHasClaim(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginRight: '8px' }}
                />
                <label className="form-check-label text-secondary-custom pt-1 small" htmlFor="hasClaim">
                  MR Claim Pending (uncheck if already processed)
                </label>
              </div>
            </div>
          </div>

          {/* Section: Claim Status & Duty Classification */}
          <div className="d-flex align-items-center gap-2 mb-3 border-bottom border-secondary pb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Allowance Claims & Duty Classification</h5>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <label className="form-label-saas">Duty Category *</label>
              <select
                className="form-select form-control-saas"
                value={dutyCategory}
                onChange={(e) => setDutyCategory(e.target.value)}
                required
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                  backgroundPosition: 'right 0.75rem center', 
                  backgroundSize: '16px 12px' 
                }}
              >
                <option value="TICKET_CHECKING">Ticket Checking</option>
                <option value="ON_DUTY">On Duty</option>
                <option value="STATION_DUTY">Station Duty</option>
                <option value="PF_CHECK">PF Check</option>
                <option value="OTHER">Other</option>
              </select>
              <small className="text-secondary-custom" style={{ fontSize: '11px' }}>Railway duty type classification</small>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label-saas">Claim Status</label>
              <select
                className="form-select form-control-saas"
                value={noClaimReason}
                onChange={(e) => {
                  const val = e.target.value;
                  setNoClaimReason(val);
                  setHasClaim(val === 'NONE');
                }}
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                  backgroundPosition: 'right 0.75rem center', 
                  backgroundSize: '16px 12px' 
                }}
              >
                <option value="NONE">Claim Eligible</option>
                <option value="CL">CL - Casual Leave</option>
                <option value="CR">CR - Compensation Rest</option>
                <option value="HQRS">HQRS</option>
                <option value="LAP">LAP</option>
                <option value="LHAP">LHAP</option>
                <option value="NH">NH</option>
                <option value="PL">PL</option>
                <option value="REST">REST</option>
                <option value="SCL">SCL</option>
                <option value="OTHER">Other (No Claim)</option>
              </select>
              <small className="text-secondary-custom" style={{ fontSize: '11px' }}>
                {noClaimReason === 'NONE' ? 'Allowances will be calculated' : 'No allowances for this duty'}
              </small>
            </div>

            <div className="col-12 col-md-4 d-flex align-items-end">
              <div className="form-check pb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="ndaEligible"
                  checked={ndaEligible}
                  onChange={(e) => setNdaEligible(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginRight: '8px' }}
                />
                <label className="form-check-label text-secondary-custom pt-1 small" htmlFor="ndaEligible">
                  NDA Eligible (Night Duty Allowance)
                </label>
              </div>
            </div>

            {noClaimReason !== 'NONE' && (
              <div className="col-12">
                <div className="p-3 rounded bg-warning-subtle border border-warning-subtle" style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15) !important' }}>
                  <div className="d-flex align-items-center gap-2 text-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span className="small font-weight-medium">
                      No-Claim Duty: TA and NDA will not be calculated for this log. Use for leave days, rest periods, or non-operational duties.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Metrics & Notes */}
          <div className="d-flex align-items-center gap-2 mb-3 border-bottom border-secondary pb-2">
            <Info size={16} className="text-primary" />
            <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Metrics & Notes</h5>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4">
              <label className="form-label-saas">Travel Distance (Km)</label>
              <input
                type="number"
                className={`form-control form-control-saas ${getConfidenceClass('distanceKm')}`}
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
              />
              {renderConfidenceAlert('distanceKm')}
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label-saas">Delay (Minutes)</label>
              <input
                type="number"
                className="form-control form-control-saas"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                disabled
              />
            </div>
            <div className="col-12 col-md-4 d-flex align-items-end">
              <div className="form-check pb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="taEligible"
                  defaultChecked
                  disabled
                  style={{ width: '20px', height: '20px', marginRight: '8px', backgroundColor: '#10b981', borderColor: 'var(--border-color)' }}
                />
                <label className="form-check-label text-secondary-custom pt-1 small" htmlFor="taEligible">Allowance Claims Eligible</label>
              </div>
            </div>

            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label-saas mb-0">Remarks / Shift Diary</label>
                <button 
                  type="button" 
                  onClick={handleNotesVoiceClick} 
                  className={`btn py-1 px-2 border-0 d-flex align-items-center gap-1 btn-sm ${isNotesListening ? 'btn-danger text-white' : 'text-info bg-transparent'}`}
                  style={{ fontSize: '13px' }}
                >
                  {isNotesListening ? <MicOff size={13} /> : <Mic size={13} />}
                  <span>{isNotesListening ? 'Recording...' : 'Speak Remarks'}</span>
                </button>
              </div>
              <textarea
                className="form-control form-control-saas"
                rows="3"
                placeholder="Coach checking details, signal delays, excess fare notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Section: Save Template */}
          {!isEditMode && (
            <div className="p-3 bg-dark border border-secondary rounded mb-4" style={{ backgroundColor: 'rgba(27, 34, 50, 0.2)' }}>
              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="saveTemplate"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginRight: '8px' }}
                />
                <label className="form-check-label text-white pt-1 small font-weight-medium" htmlFor="saveTemplate">Save Route as Template</label>
              </div>
              {saveAsTemplate && (
                <div className="mt-2">
                  <label className="form-label-saas">Template Name</label>
                  <input
                    type="text"
                    className="form-control form-control-saas py-1"
                    placeholder="e.g. Daily Shatabdi Run"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    required={saveAsTemplate}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="d-flex justify-content-end gap-2 pt-3 border-top border-secondary">
            <Link to="/journeys" className="btn btn-saas-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-glow-primary">
              {isEditMode ? 'Update Log' : 'Save Duty Log'}
            </button>
          </div>

        </form>
      </div>

      {/* Feature 09: Voice Duty Logging Modal */}
      {showVoiceModal && (
        <div 
          className="modal d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowVoiceModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <div className="modal-header border-bottom border-secondary">
                <h5 className="modal-title text-white fw-bold d-flex align-items-center gap-2">
                  <Mic size={20} className="text-success" />
                  AI Voice Duty Logging
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowVoiceModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Recording Controls */}
                <div className="text-center mb-4">
                  {!isVoiceRecording && !voiceTranscript && (
                    <button 
                      type="button"
                      onClick={handleStartVoiceRecording}
                      className="btn btn-glow-success btn-lg px-5 py-3 d-inline-flex align-items-center gap-2"
                    >
                      <Mic size={24} />
                      <span>Start Recording</span>
                    </button>
                  )}

                  {isVoiceRecording && (
                    <div>
                      <button 
                        type="button"
                        onClick={handleStopVoiceRecording}
                        className="btn btn-danger btn-lg px-5 py-3 d-inline-flex align-items-center gap-2"
                      >
                        <MicOff size={24} />
                        <span>Stop Recording</span>
                      </button>
                      <div className="mt-3">
                        <div className="spinner-border text-success" role="status">
                          <span className="visually-hidden">Recording...</span>
                        </div>
                        <p className="text-success mt-2 mb-0">Listening... Speak now</p>
                      </div>
                    </div>
                  )}

                  {voiceTranscript && !isVoiceRecording && (
                    <button 
                      type="button"
                      onClick={handleStartVoiceRecording}
                      className="btn btn-outline-success px-4 py-2"
                    >
                      <Mic size={16} className="me-2" />
                      Record Again
                    </button>
                  )}
                </div>

                {/* Transcript Display */}
                {voiceTranscript && (
                  <div className="mb-4">
                    <label className="form-label-saas mb-2">Transcript</label>
                    <div 
                      className="p-3 rounded" 
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--border-color)' 
                      }}
                    >
                      <p className="text-white mb-0" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        "{voiceTranscript}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Processing Indicator */}
                {voiceProcessing && (
                  <div className="text-center text-info mb-4">
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>Gemini AI extracting fields...</span>
                  </div>
                )}

                {/* Error Display */}
                {voiceError && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
                    <AlertTriangle size={16} />
                    <span>{voiceError}</span>
                  </div>
                )}

                {/* Extracted Fields Review */}
                {voiceExtractedFields.length > 0 && !voiceProcessing && (
                  <div className="mb-4">
                    <label className="form-label-saas mb-3">Extracted Fields ({voiceExtractedFields.length})</label>
                    <div className="row g-3">
                      {voiceExtractedFields.map((item, idx) => {
                        const isStationField = item.field === 'departureStation' || item.field === 'arrivalStation' || item.field === 'remittedAtStation';
                        const hasStationMatch = isStationField && item.stationMatch;
                        const needsConfirmation = hasStationMatch && item.stationMatch.type === 'ambiguous' && !item.confirmedStation && !item.keepOriginal;
                        
                        return (
                          <div key={idx} className="col-12 col-md-6">
                            <div 
                              className="p-3 rounded" 
                              style={{ 
                                backgroundColor: item.confirmedStation ? 'rgba(34, 197, 94, 0.1)' : needsConfirmation ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                                border: item.confirmedStation ? '1px solid rgba(34, 197, 94, 0.3)' : needsConfirmation ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)' 
                              }}
                            >
                              <div className="d-flex align-items-center gap-2 mb-1">
                                {item.confirmedStation ? (
                                  <CheckCircle2 size={14} className="text-success" />
                                ) : needsConfirmation ? (
                                  <AlertTriangle size={14} className="text-warning" />
                                ) : (
                                  <CheckCircle2 size={14} className="text-success" />
                                )}
                                <small className="text-secondary-custom" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {item.field.replace(/([A-Z])/g, ' $1').trim()}
                                </small>
                              </div>
                              <p className="text-white mb-0 fw-medium" style={{ fontSize: '14px' }}>
                                {item.confirmedStation ? `${item.confirmedStation.code} - ${item.confirmedStation.name}` : String(item.value)}
                              </p>
                              
                              {/* Feature 12 Phase 2: Station Match Confirmation UI */}
                              {needsConfirmation && (
                                <div className="mt-2 pt-2 border-top border-secondary">
                                  <small className="text-warning d-block mb-2" style={{ fontSize: '11px' }}>
                                    Multiple matches for "{item.originalValue}":
                                  </small>
                                  <div className="d-flex flex-column gap-1">
                                    {item.stationMatch.suggestions.slice(0, 3).map(station => (
                                      <button
                                        key={station.code}
                                        type="button"
                                        onClick={() => handleConfirmVoiceStation(idx, station)}
                                        className="btn btn-sm btn-outline-success text-start d-flex align-items-center justify-content-between p-2"
                                        style={{ fontSize: '11px' }}
                                      >
                                        <span>
                                          <strong>{station.code}</strong> - {station.name}
                                        </span>
                                        {station.zone && (
                                          <span className="badge bg-success-subtle text-success" style={{ fontSize: '9px' }}>
                                            {station.zone}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => handleKeepVoiceText(idx)}
                                      className="btn btn-sm btn-outline-secondary p-2"
                                      style={{ fontSize: '11px' }}
                                    >
                                      Keep "{item.originalValue}"
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {hasStationMatch && item.stationMatch.type === 'unmatched' && !item.keepOriginal && (
                                <small className="text-warning d-block mt-2" style={{ fontSize: '10px' }}>
                                  <AlertTriangle size={10} className="me-1" />
                                  No directory match found
                                </small>
                              )}
                              
                              {hasStationMatch && item.keepOriginal && (
                                <small className="text-info d-block mt-2" style={{ fontSize: '10px' }}>
                                  <Info size={10} className="me-1" />
                                  Using original text
                                </small>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="alert alert-info mt-3 mb-0 d-flex align-items-start gap-2" style={{ fontSize: '13px' }}>
                      <Info size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Review the extracted fields above. Confirm any ambiguous station matches before applying.</span>
                    </div>
                  </div>
                )}

                {/* Help Text */}
                {!voiceTranscript && !isVoiceRecording && (
                  <div className="alert alert-info mb-0" style={{ fontSize: '13px' }}>
                    <strong className="d-block mb-2">Example phrases:</strong>
                    <ul className="mb-0 ps-3">
                      <li>"I worked train 12951 Mumbai Rajdhani from Mumbai Central to New Delhi on November 10"</li>
                      <li>"Departed at 5:30 PM, arrived 30 minutes late at 9:00 AM next day"</li>
                      <li>"Ticket checking duty, distance 1384 kilometers, MR number 12345"</li>
                      <li>"Left headquarters at 4 PM, returned at 11 AM"</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top border-secondary">
                <button 
                  type="button"
                  className="btn btn-saas-secondary"
                  onClick={() => setShowVoiceModal(false)}
                >
                  Cancel
                </button>
                {voiceExtractedFields.length > 0 && (
                  <button 
                    type="button"
                    className="btn btn-glow-primary"
                    onClick={handleApplyVoiceFields}
                  >
                    Apply to Form
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JourneyForm;
