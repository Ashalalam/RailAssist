import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useJourneys } from '../contexts/JourneyContext';
import { api } from '../services/api';
import localDB from '../services/db';
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
  const [confidenceScores, setConfidenceScores] = useState({});

  // Voice Logging States
  const [isNotesListening, setIsNotesListening] = useState(false);
  const notesRecognitionRef = useRef(null);

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
          }
        } catch (err) {
          console.error('Failed to load journey for edit:', err);
        }
      };
      loadJourney();
    }
  }, [id, isEditMode]);

  // Voice recognition init
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
        
        if (res.trainNumber_confidence >= 80) setTrainNumber(res.trainNumber || '');
        if (res.trainName_confidence >= 80) setTrainName(res.trainName || '');
        if (res.departureStation_confidence >= 80) setDepartureStation(res.departureStation || '');
        if (res.arrivalStation_confidence >= 80) setArrivalStation(res.arrivalStation || '');
        if (res.scheduledDeparture_confidence >= 80) setScheduledDeparture(formatDateForInput(res.scheduledDeparture));
        if (res.scheduledArrival_confidence >= 80) setScheduledArrival(formatDateForInput(res.scheduledArrival));
        if (res.actualDeparture_confidence >= 80) setActualDeparture(formatDateForInput(res.actualDeparture));
        if (res.actualArrival_confidence >= 80) setActualArrival(formatDateForInput(res.actualArrival));
        if (res.distanceKm_confidence >= 80) setDistanceKm((res.distanceKm || 0).toString());

        setConfidenceScores({
          trainNumber: res.trainNumber_confidence,
          trainName: res.trainName_confidence,
          departureStation: res.departureStation_confidence,
          arrivalStation: res.arrivalStation_confidence,
          scheduledDeparture: res.scheduledDeparture_confidence,
          scheduledArrival: res.scheduledArrival_confidence,
          actualDeparture: res.actualDeparture_confidence,
          actualArrival: res.actualArrival_confidence,
          distanceKm: res.distanceKm_confidence
        });

        setOcrSuccessMsg('AI OCR Slip processing complete! Review highlighted fields.');
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
      notes
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
              <label className="form-label-saas">From Station *</label>
              <input
                type="text"
                className={`form-control form-control-saas ${getConfidenceClass('departureStation')}`}
                placeholder="e.g. MMCT"
                value={departureStation}
                onChange={(e) => setDepartureStation(e.target.value)}
                required
              />
              {renderConfidenceAlert('departureStation')}
            </div>
            <div className="col-6">
              <label className="form-label-saas">To Station *</label>
              <input
                type="text"
                className={`form-control form-control-saas ${getConfidenceClass('arrivalStation')}`}
                placeholder="e.g. NDLS"
                value={arrivalStation}
                onChange={(e) => setArrivalStation(e.target.value)}
                required
              />
              {renderConfidenceAlert('arrivalStation')}
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
    </div>
  );
};

export default JourneyForm;
