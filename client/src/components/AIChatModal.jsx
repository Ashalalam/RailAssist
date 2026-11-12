import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourneys } from '../contexts/JourneyContext';
import { useAuth } from '../contexts/AuthContext';

const AIChatModal = () => {
  const { user } = useAuth();
  const { askCopilot } = useJourneys();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your RailAssist AI Copilot. You can ask me about your Monthly TA/NDA, write shift logs, or say "Show reports" to navigate.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Init webkit speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Indian English / general English

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      rec.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleVoiceListen = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Try Google Chrome or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await askCopilot(userText);
      
      setMessages(prev => [...prev, { role: 'assistant', text: res.answer }]);

      // Execute Copilot Action Protocols
      if (res.action && res.action !== 'NONE') {
        setTimeout(() => {
          executeAction(res.action, res.params);
        }, 1200);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error communicating with copilot: ' + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = (action) => {
    switch (action) {
      case 'NAVIGATE_REPORTS':
        setMessages(prev => [...prev, { role: 'system', text: '⚡ Copilot Action: Navigating to Reports page...' }]);
        navigate('/reports');
        break;
      case 'OPEN_JOURNEY_FORM':
        setMessages(prev => [...prev, { role: 'system', text: '⚡ Copilot Action: Opening new duty log form...' }]);
        navigate('/journeys/new');
        break;
      case 'NAVIGATE_ANALYTICS':
        setMessages(prev => [...prev, { role: 'system', text: '⚡ Copilot Action: Opening analytics visualizations...' }]);
        navigate('/analytics');
        break;
      default:
        break;
    }
  };

  if (!user) return null;

  return (
    <div className="no-print">
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn d-flex align-items-center justify-content-center"
        style={{
          position: 'fixed',
          bottom: '80px', // sit just above bottom nav
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
          border: 'none',
          boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
          zIndex: 1040,
          transition: 'all 0.2s ease'
        }}
      >
        {isOpen ? (
          <i className="bi bi-x-lg text-white fs-4"></i>
        ) : (
          <i className="bi bi-robot text-white fs-3"></i>
        )}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div 
          className="card-saas d-flex flex-column"
          style={{
            position: 'fixed',
            bottom: '146px',
            right: '20px',
            width: '350px',
            height: '420px',
            zIndex: 1040,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
            padding: 0,
            border: '1px solid #DBEAFE'
          }}
        >
          {/* Header */}
          <div className="p-3 d-flex align-items-center gap-2" style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #DBEAFE' }}>
            <i className="bi bi-robot fs-5" style={{ color: '#0EA5E9' }}></i>
            <div>
              <h6 className="mb-0" style={{ fontSize: '14px', color: '#0C4A6E' }}>RailAssist AI Copilot</h6>
              <small style={{ fontSize: '11px', color: '#64748B' }}>RAG Analytics Assistant</small>
            </div>
          </div>

          {/* Messages Logs Area */}
          <div className="flex-grow-1 p-3 overflow-y-auto d-flex flex-column gap-3" style={{ fontSize: '13px', backgroundColor: '#FFFFFF' }}>
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`p-2 rounded max-width-75 ${m.role === 'user' ? 'align-self-end' : (m.role === 'system' ? 'text-center align-self-center py-1 w-100' : 'align-self-start')}`}
                style={{
                  maxWidth: m.role === 'system' ? '100%' : '80%',
                  color: m.role === 'user' ? '#0C4A6E' : (m.role === 'system' ? '#0EA5E9' : '#0C4A6E'),
                  backgroundColor: m.role === 'user' ? '#E0F2FE' : (m.role === 'system' ? '#F0F9FF' : '#FFFFFF'),
                  border: `1px solid ${m.role === 'user' ? '#BAE6FD' : (m.role === 'system' ? '#DBEAFE' : '#E5E7EB')}`
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="p-2 rounded align-self-start" style={{ maxWidth: '80%', backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB', color: '#64748B' }}>
                <span className="spinner-grow spinner-grow-sm me-1" role="status"></span>
                <span>Typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <form onSubmit={handleSend} className="p-2 d-flex gap-2" style={{ borderTop: '1px solid #DBEAFE', backgroundColor: '#F8FAFC' }}>
            <input 
              type="text" 
              className="form-control form-control-saas py-1" 
              placeholder={isListening ? "Listening..." : "Ask copilot..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{ fontSize: '13px' }}
            />
            {/* Microphone dictation */}
            <button 
              type="button" 
              onClick={handleVoiceListen}
              className={`btn p-1 px-2 ${isListening ? 'btn-danger' : 'btn-saas-secondary'}`}
              disabled={loading}
            >
              <i className={`bi ${isListening ? 'bi-mic-mute-fill' : 'bi-mic-fill'}`}></i>
            </button>
            <button type="submit" className="btn btn-glow-primary p-1 px-3" disabled={loading}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChatModal;
