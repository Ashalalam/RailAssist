import { useAuth } from '../contexts/AuthContext';
import { useJourneys } from '../contexts/JourneyContext';

const OfflineIndicator = () => {
  const { isOnline } = useAuth();
  const { syncing, syncProgress } = useJourneys();

  if (!isOnline) {
    return (
      <div className="offline-banner no-print">
        <i className="bi bi-wifi-off me-2"></i>
        Offline Mode Active. Journeys will be cached locally on this device.
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="sync-banner no-print d-flex align-items-center justify-content-center gap-2">
        <i className="bi bi-arrow-repeat spin me-2"></i>
        <span>Syncing offline journeys with database... {syncProgress}%</span>
        <div className="progress mx-2 d-none d-sm-flex" style={{ width: '100px', height: '6px', backgroundColor: 'rgba(9, 13, 22, 0.2)' }}>
          <div 
            className="progress-bar bg-dark" 
            role="progressbar" 
            style={{ width: `${syncProgress}%` }}
            aria-valuenow={syncProgress} 
            aria-valuemin="0" 
            aria-valuemax="100"
          ></div>
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;
