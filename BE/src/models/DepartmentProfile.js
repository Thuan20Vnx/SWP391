const mongoose = require('mongoose');

const DEPARTMENT_TYPES = ['ctsv', 'icpdp'];

const departmentProfileSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: DEPARTMENT_TYPES,
      required: true,
      unique: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    updatedByEmail: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

departmentProfileSchema.pre('save', async function () {
  const { persistDepartmentThumbnailOnDocument } = require('../utils/departmentProfileStorage');
  await persistDepartmentThumbnailOnDocument(this);
});

departmentProfileSchema.statics.TYPES = DEPARTMENT_TYPES;

module.exports = mongoose.model('DepartmentProfile', departmentProfileSchema);
