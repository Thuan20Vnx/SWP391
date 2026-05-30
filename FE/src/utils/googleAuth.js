import { API_BASE } from './api';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '462966212822-ohmu33pmrp4dcpuq3hm00tnvuac4jqa9.apps.googleusercontent.com';

export const GOOGLE_REDIRECT_URI = `${API_BASE}/api/auth/google/callback`;

export const startGoogleLogin = () => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};
