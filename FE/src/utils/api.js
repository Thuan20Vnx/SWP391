const API_BASE = 'http://localhost:5000';

export const getAuthHeaders = (json = true) => {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('authToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export { API_BASE };
