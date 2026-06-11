const mongoose = require('mongoose');

const SYSTEM_SETTINGS_ID = 'global';

const systemSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SYSTEM_SETTINGS_ID },
    maintenanceMode: { type: Boolean, default: false },
    publicAnnouncements: { type: Boolean, default: true },
    maintenanceMessage: {
      type: String,
      default: 'Hệ thống đang bảo trì định kỳ. Vui lòng quay lại sau.',
      trim: true,
    },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

systemSettingsSchema.statics.GLOBAL_ID = SYSTEM_SETTINGS_ID;

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
