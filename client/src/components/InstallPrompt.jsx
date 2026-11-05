import { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If running in standalone mode, do not register listener
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to show the install button
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="card-saas card-glow mb-4 p-3 no-print">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-circle bg-dark p-2 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', border: '1px solid var(--border-color)' }}>
            <i className="bi bi-phone-vibrate text-info fs-4"></i>
          </div>
          <div>
            <h6 className="mb-0 text-white">Install RailAssist PWA</h6>
            <small className="text-muted-custom">Get offline-first access, native app shell, and quick launcher icons.</small>
          </div>
        </div>
        <div>
          <button onClick={handleInstallClick} className="btn btn-glow-primary py-2 px-3 fs-6">
            <i className="bi bi-download me-2"></i>Install App
          </button>
          <button onClick={() => setIsVisible(false)} className="btn btn-saas-secondary py-2 px-3 ms-2 fs-6">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
