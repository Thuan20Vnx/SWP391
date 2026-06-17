export const SETTINGS_SYNC_EVENT = 'fevents_settings_sync';

export const dispatchSettingsSync = () => {
  window.dispatchEvent(new CustomEvent(SETTINGS_SYNC_EVENT));
};
