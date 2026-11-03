import React, { useState, useEffect } from 'react';

const Notifications = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [preferences, setPreferences] = useState({
    shiftAlerts: true,
    syncAlerts: true,
    reportAlerts: false,
    systemUpdates: true
  });
  const [testStatus, setTestStatus] = useState('');

  const handleRequestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        new Notification("RailAssist", {
          body: "Notifications enabled successfully!",
          icon: "/logo.svg"
        });
      }
    } catch (err) {
      console.log('Error requesting notification permission:', err);
    }
  };

  const handleTogglePreference = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const triggerTestNotification = () => {
    if (permission !== 'granted') {
      setTestStatus('Please click the "Enable Device Alerts" button above first.');
      return;
    }
    
    setTestStatus('Dispatching mock notification in 3 seconds...');
    setTimeout(() => {
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification("RailAssist Dispatch Alert", {
              body: "Train 12951 delay updated. Scheduled actual is now 16:25.",
              icon: "/logo.svg",
              vibrate: [200, 100, 200]
            });
            setTestStatus('Notification sent!');
            setTimeout(() => setTestStatus(''), 2000);
          });
        } else {
          new Notification("RailAssist Dispatch Alert", {
            body: "Train 12951 delay updated. Scheduled actual is now 16:25.",
            icon: "/logo.svg"
          });
          setTestStatus('Notification sent!');
          setTimeout(() => setTestStatus(''), 2000);
        }
      } catch (err) {
        console.error('Trigger mock notification failed:', err);
      }
    }, 3000);
  };

  return (
    <div className="app-container">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-white mb-1">Alert Configurations</h2>
        <p className="text-muted-custom">Configure device push notification triggers and shift alarms</p>
      </div>

      <div className="card-saas card-glow mb-4">
        <h5 className="text-white mb-3">Device Permission Status</h5>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <p className="text-muted-custom mb-1">Current system status:</p>
            <span className={`badge py-2 px-3 border fs-6 ${permission === 'granted' ? 'bg-success-subtle text-success border-success-subtle' : (permission === 'denied' ? 'bg-danger-subtle text-danger border-danger-subtle' : 'bg-warning-subtle text-warning border-warning-subtle')}`}>
              <i className={`bi ${permission === 'granted' ? 'bi-bell-fill' : 'bi-bell-slash'}`}></i> {permission.toUpperCase()}
            </span>
          </div>
          {permission !== 'granted' && (
            <button onClick={handleRequestPermission} className="btn btn-glow-primary">
              Enable Device Alerts
            </button>
          )}
        </div>
      </div>

      <div className="card-saas mb-4">
        <h5 className="text-white mb-3">Notification Preferences</h5>
        
        {/* Preference Checkboxes */}
        <div className="d-flex flex-column gap-3">
          
          {/* Item 1 */}
          <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-3">
            <div>
              <h6 className="text-white mb-0">Duty Shift Reminders</h6>
              <small className="text-muted-custom">Reminds you 1 hour before scheduled train departure times.</small>
            </div>
            <div className="form-check form-switch">
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                checked={preferences.shiftAlerts} 
                onChange={() => handleTogglePreference('shiftAlerts')}
                style={{ width: '40px', height: '20px' }}
              />
            </div>
          </div>

          {/* Item 2 */}
          <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-3">
            <div>
              <h6 className="text-white mb-0">Database Sync Success</h6>
              <small className="text-muted-custom">Alerts you when offline logs successfully sync to MongoDB Atlas.</small>
            </div>
            <div className="form-check form-switch">
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                checked={preferences.syncAlerts} 
                onChange={() => handleTogglePreference('syncAlerts')}
                style={{ width: '40px', height: '20px' }}
              />
            </div>
          </div>

          {/* Item 3 */}
          <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-3">
            <div>
              <h6 className="text-white mb-0">Weekly Report Digests</h6>
              <small className="text-muted-custom">Prompts you to review and compile reports at the end of each week.</small>
            </div>
            <div className="form-check form-switch">
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                checked={preferences.reportAlerts} 
                onChange={() => handleTogglePreference('reportAlerts')}
                style={{ width: '40px', height: '20px' }}
              />
            </div>
          </div>

          {/* Item 4 */}
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="text-white mb-0">System updates & bulletins</h6>
              <small className="text-muted-custom">Alerts you when official railway allowance rule tables change.</small>
            </div>
            <div className="form-check form-switch">
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                checked={preferences.systemUpdates} 
                onChange={() => handleTogglePreference('systemUpdates')}
                style={{ width: '40px', height: '20px' }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Test notification panel */}
      <div className="card-saas">
        <h5 className="text-white mb-2">Simulate Dispatch Push Notification</h5>
        <p className="text-muted-custom small mb-3">Tests background push notification capabilities. Once clicked, you can lock your screen or go to another app to see the native alert pop up.</p>
        <button onClick={triggerTestNotification} className="btn btn-saas-secondary py-2 mb-2">
          Test Push Dispatch
        </button>
        {testStatus && (
          <div className="text-info small mt-1">
            <i className="bi bi-info-circle me-1"></i> {testStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
