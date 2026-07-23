import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-provider';
import { showSalesAlertToast } from '@/features/sales/ui/sales-alert';

const LAST_PATH_KEY = 'yuksales.pwa.lastPath';
const UPDATED_AT_KEY = 'yuksales.pwa.updatedAt';

export function PwaUpdateListener() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Auto-save active route path whenever location changes
  useEffect(() => {
    if (user && location.pathname !== '/login') {
      const fullPath = location.pathname + location.search + location.hash;
      localStorage.setItem(LAST_PATH_KEY, fullPath);
    }
  }, [location, user]);

  // 2. On mount, check if we just reloaded after a PWA update and restore route if needed
  useEffect(() => {
    const updatedAt = localStorage.getItem(UPDATED_AT_KEY);
    if (updatedAt) {
      localStorage.removeItem(UPDATED_AT_KEY);
      const savedPath = localStorage.getItem(LAST_PATH_KEY);
      
      // If we are currently on root or home, restore saved path
      if (user && savedPath && savedPath !== (location.pathname + location.search) && !savedPath.startsWith('/login')) {
        setTimeout(() => {
          navigate(savedPath, { replace: true });
        }, 150);
      }

      // Show toast notifying user that PWA updated and draft/activity was preserved
      setTimeout(() => {
        showSalesAlertToast('Aplikasi berhasil diperbarui ke versi terbaru! Draft & posisi Anda telah dipulihkan.', 'success');
      }, 600);
    }
  }, []);

  // 3. Listen to Service Worker updates & trigger hard refresh after saving state
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    // Trigger reload on controllerchange (when new SW takes over)
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;

      // Save active path and updated flag before reloading
      const fullPath = window.location.pathname + window.location.search + window.location.hash;
      localStorage.setItem(LAST_PATH_KEY, fullPath);
      localStorage.setItem(UPDATED_AT_KEY, String(Date.now()));

      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Also check registration for updates periodically (e.g. every 10 minutes)
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed! Ask SW to skip waiting and activate
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
