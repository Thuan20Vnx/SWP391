import { API_BASE } from './api';
import { clearSession } from './auth';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '961679973354-7lbmf87ehfimgritjda29mdfb0e8d3rs.apps.googleusercontent.com';

export const GOOGLE_REDIRECT_URI = `${API_BASE}/api/auth/google/callback`;

export const startGoogleLogin = () => {
  clearSession();

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};
