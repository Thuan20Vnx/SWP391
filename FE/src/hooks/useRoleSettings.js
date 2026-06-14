import { useCallback, useMemo, useState } from 'react';
import { getUserRole, normalizeRole } from '../utils/auth';
import {
  getRoleNotificationOptions,
  loadRoleNotifications,
  normalizeSettingsRole,
  saveRoleNotifications,
} from '../components/settings/settingsRoleConfig';
import { useSettingsPreferences } from './useSettingsPreferences';

export const useRoleSettings = (roleProp) => {
  const role = normalizeSettingsRole(roleProp || normalizeRole(getUserRole()));
  const { settings, updateSetting } = useSettingsPreferences();
  const [roleNotifs, setRoleNotifs] = useState(() => loadRoleNotifications(role));

  const notificationOptions = useMemo(() => getRoleNotificationOptions(role), [role]);

  const updateRoleNotification = useCallback(
    (key, value) => {
      setRoleNotifs((prev) => {
        const next = { ...prev, [key]: value };
        saveRoleNotifications(role, next);
        return next;
      });
    },
    [role]
  );

  const getNotificationValue = useCallback(
    (key, universalDefault) => {
      if (Object.prototype.hasOwnProperty.call(roleNotifs, key)) {
        return Boolean(roleNotifs[key]);
      }
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        return Boolean(settings[key]);
      }
      return Boolean(universalDefault);
    },
    [roleNotifs, settings]
  );

  const setNotificationValue = useCallback(
    (key, value, isUniversal) => {
      if (isUniversal) {
        updateSetting(key, value);
        return;
      }
      updateRoleNotification(key, value);
    },
    [updateRoleNotification, updateSetting]
  );

  return {
    role,
    settings,
    updateSetting,
    notificationOptions,
    getNotificationValue,
    setNotificationValue,
  };
};
