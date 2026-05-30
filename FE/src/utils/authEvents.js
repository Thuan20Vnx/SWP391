export const AUTH_CHANGED_EVENT = 'fevents-auth-changed';

export const dispatchAuthChanged = () => {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};
