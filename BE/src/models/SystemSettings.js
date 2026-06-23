const mongoose = require('mongoose');

const SYSTEM_SETTINGS_ID = 'global';

const emailSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    host: { type: String, default: 'smtp.gmail.com', trim: true },
    port: { type: Number, default: 587 },
    encryption: { type: String, default: 'TLS', trim: true }, // TLS | SSL | NONE
    fromName: { type: String, default: 'F-Events', trim: true },
    fromEmail: { type: String, default: '', trim: true },
    replyTo: { type: String, default: '', trim: true },
    dailyLimit: { type: Number, default: 500 },
    timeoutSeconds: { type: Number, default: 12 },
  },
  { _id: false },
);

const paymentSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    provider: { type: String, default: 'sepay', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    bankCode: { type: String, default: '', trim: true }, // mã/short_name NH theo SePay (vd: VPBank, Vietcombank)
    accountHolder: { type: String, default: '', trim: true },
    webhookApiKey: { type: String, default: '', trim: true }, // khóa xác thực webhook (Authorization: Apikey ...)
    expireMinutes: { type: Number, default: 15 }, // thời hạn 1 đơn thanh toán
  },
  { _id: false },
);

const securitySettingsSchema = new mongoose.Schema(
  {
    jwtHours: { type: Number, default: 168 },
    otpMinutes: { type: Number, default: 5 },
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutMinutes: { type: Number, default: 15 },
    forceHttps: { type: Boolean, default: false },
    auditLog: { type: Boolean, default: true },
    corsOrigins: { type: String, default: 'http://localhost:5173', trim: true },
    apiRateLimit: { type: Number, default: 120 },
    passwordMinLength: { type: Number, default: 8 },
    requireStrongPassword: { type: Boolean, default: true },
  },
  { _id: false },
);

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
    maintenanceActivatedAt: { type: Date, default: null },
    email: { type: emailSettingsSchema, default: () => ({}) },
    payment: { type: paymentSettingsSchema, default: () => ({}) },
    security: { type: securitySettingsSchema, default: () => ({}) },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

systemSettingsSchema.statics.GLOBAL_ID = SYSTEM_SETTINGS_ID;

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
