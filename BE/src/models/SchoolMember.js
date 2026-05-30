const mongoose = require('mongoose');

const schoolMemberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['student', 'staff', 'ctsv', 'club_manager'],
    required: true
  },
  studentId: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

const SchoolMember = mongoose.model('SchoolMember', schoolMemberSchema);

module.exports = SchoolMember;
