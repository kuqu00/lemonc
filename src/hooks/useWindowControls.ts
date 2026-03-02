import { useCallback } from 'react';

export function useWindowControls() {
  const minimize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      await window.minimize();
    } catch (error) {
      console.error('Minimize failed:', error);
    }
  }, []);

  const maximize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      await window.toggleMaximize();
    } catch (error) {
      console.error('Maximize failed:', error);
    }
  }, []);

  const close = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      await window.hide();
    } catch (error) {
      console.error('Close failed:', error);
    }
  }, []);

  const hide = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      await window.hide();
    } catch (error) {
      console.error('Hide failed:', error);
    }
  }, []);

  const show = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      await window.show();
      await window.setFocus();
    } catch (error) {
      console.error('Show failed:', error);
    }
  }, []);

  return {
    minimize,
    maximize,
    close,
    hide,
    show
  };
}
