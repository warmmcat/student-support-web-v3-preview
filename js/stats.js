'use strict';

(() => {
  const STORAGE_KEY = 'studentSupportAnonymousBrowserId';
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzY3F6tz2Guy4A11VeK1GsmZsrR5z_RY2vmRDOxpo8Lcki0VI3S-21lGxozAECGObNc/exec';

  function createAnonymousBrowserId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();

    const bytes = new Uint8Array(16);
    window.crypto?.getRandomValues?.(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join('-');
  }

  function getAnonymousBrowserId() {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = createAnonymousBrowserId();
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return createAnonymousBrowserId();
    }
  }

  function recordDraw(hexagram) {
    if (!ENDPOINT || !hexagram) return;

    const payload = new URLSearchParams({
      timestamp: new Date().toISOString(),
      hexagramNumber: String(hexagram.number ?? ''),
      hexagramName: String(hexagram.name ?? ''),
      anonymousBrowserId: getAnonymousBrowserId()
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          ENDPOINT,
          new Blob([payload.toString()], { type: 'application/x-www-form-urlencoded;charset=UTF-8' })
        );
        return;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: payload.toString(),
        keepalive: true
      }).catch(() => {});
    } catch {
      // 統計失敗不能影響抽籤主流程。
    }
  }

  window.StudentSupportStats = {
    getAnonymousBrowserId,
    recordDraw
  };
})();
