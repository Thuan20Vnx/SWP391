const DepartmentProfile = require('../models/DepartmentProfile');
const AppError = require('../utils/AppError');
const { sanitizeDepartmentProfileForApi } = require('../utils/departmentProfileStorage');

const assertValidType = (type) => {
  if (!DepartmentProfile.TYPES.includes(type)) {
    throw new AppError('Loại đơn vị không hợp lệ!', 400);
  }
};

const getDepartmentProfile = async (type) => {
  assertValidType(type);
  const doc = await DepartmentProfile.findOne({ type }).lean();
  return sanitizeDepartmentProfileForApi(doc || { type });
};

const getAllDepartmentProfiles = async () => {
  const docs = await DepartmentProfile.find({}).lean();
  const byType = new Map(docs.map((d) => [d.type, d]));
  return DepartmentProfile.TYPES.reduce((acc, type) => {
    acc[type] = sanitizeDepartmentProfileForApi(byType.get(type) || { type });
    return acc;
  }, {});
};

const updateDepartmentProfile = async (type, { thumbnail, description }, authEmail) => {
  assertValidType(type);
  let doc = await DepartmentProfile.findOne({ type });
  if (!doc) {
    doc = new DepartmentProfile({ type });
  }
  if (thumbnail !== undefined) {
    doc.thumbnail = thumbnail || '';
  }
  if (description !== undefined) {
    doc.description = String(description || '').trim();
  }
  doc.updatedByEmail = authEmail || '';
  await doc.save();
  return sanitizeDepartmentProfileForApi(doc.toObject());
};

module.exports = {
  getDepartmentProfile,
  getAllDepartmentProfiles,
  updateDepartmentProfile,
};
