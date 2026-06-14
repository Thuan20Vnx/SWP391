const SCAN_PATHS = ['/scan-qr', '/quet-qr'];

export const parseScanQrPayload = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return null;

  try {
    const url = new URL(text, window.location.origin);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const isScanPath = SCAN_PATHS.some((segment) => path === segment || path.endsWith(segment));
    if (!isScanPath) return null;

    const eventId = url.searchParams.get('eventId') || '';
    const token = url.searchParams.get('token') || '';
    const action = url.searchParams.get('action') === 'checkout' ? 'checkout' : 'checkin';
    if (!eventId || !token) return null;

    return { eventId, token, action };
  } catch {
    return null;
  }
};
