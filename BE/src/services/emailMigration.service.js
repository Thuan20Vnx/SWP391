/**
 * Di chuyển dữ liệu khi người dùng đổi email đăng nhập.
 *
 * Hệ thống định danh người dùng bằng email chứ không phải _id: JWT chỉ mang
 * {email, role}, và khoảng 15 collection lưu email của người dùng thay vì
 * ObjectId. Nếu chỉ đổi User.email mà không đụng tới những nơi đó thì người dùng
 * sẽ mất hồ sơ đối tác, toàn bộ thông báo, nhắc sự kiện, lịch sử thanh toán...
 *
 * File này gom tất cả những chỗ đó vào một bảng khai báo để đổi email là một
 * thao tác nguyên tử, có thể chạy thử trước và có log rõ ràng.
 */

const mongoose = require('mongoose');

/**
 * Các collection lưu email người dùng ở trường chuỗi thường.
 * `model` là tên model đã đăng ký với mongoose.
 */
const SCALAR_EMAIL_FIELDS = [
  {
    model: 'Partner',
    fields: ['email', 'ctsvApprovedByEmail', 'approvedByEmail', 'terminationRequestedByEmail'],
  },
  { model: 'PartnerMember', fields: ['email', 'addedByEmail'] },
  { model: 'EventReminder', fields: ['email'] },
  { model: 'PartnerEventRequest', fields: ['partnerEmail'] },
  {
    model: 'ClubRegistration',
    fields: ['presidentEmail', 'contactEmail', 'submittedByEmail', 'reviewedByEmail'],
  },
  { model: 'SubmittedCtsvReport', fields: ['submittedByEmail', 'partnerEmail'] },
  { model: 'EventProposal', fields: ['submittedByEmail'] },
  { model: 'Announcement', fields: ['targetPartnerEmail', 'publishedByEmail'] },
  { model: 'Payment', fields: ['userEmail'] },
  { model: 'ClubSemesterTimeline', fields: ['submittedByEmail', 'reviewedByEmail'] },
  { model: 'Club', fields: ['email'] },
  {
    model: 'Event',
    fields: [
      'createdByEmail',
      'approvedByEmail',
      'ctsvSubmittedByEmail',
      'adminApprovedByEmail',
      'moderationRequestedByEmail',
      'settlement.paidByEmail',
    ],
  },
  { model: 'EventChangeRequest', fields: ['requestedByEmail', 'processedByEmail'] },
  { model: 'ClubChangeRequest', fields: ['requestedByEmail', 'processedByEmail'] },
  { model: 'Contract', fields: ['approvedByEmail'] },
  { model: 'DepartmentProfile', fields: ['updatedByEmail'] },
];

/** Các collection lưu email trong mảng. */
const ARRAY_EMAIL_FIELDS = [
  { model: 'Notification', fields: ['recipientEmails', 'readByEmails', 'deletedByEmails'] },
];

/**
 * CỐ Ý KHÔNG ĐỘNG TỚI:
 * - AuditLog.actorEmail — nhật ký kiểm toán phải giữ đúng email tại thời điểm
 *   hành động xảy ra, sửa lại là làm sai lịch sử.
 * - LoginLockout.email — di chuyển sẽ biến việc đổi email thành cách né khóa
 *   đăng nhập. Thay vào đó, đổi email bị chặn khi tài khoản đang bị khóa.
 * - SchoolMember.email — danh sách trắng do Nhà trường quản lý, không phải dữ
 *   liệu của người dùng.
 */
const INTENTIONALLY_SKIPPED = ['AuditLog', 'LoginLockout', 'SchoolMember'];

const getModel = (name) => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/**
 * Những collection có ràng buộc duy nhất liên quan tới email. Nếu email mới đã
 * xuất hiện ở đó (dù chưa có tài khoản User nào dùng), việc di chuyển sẽ vi phạm
 * unique index và hỏng giữa chừng — nên phải chặn từ trước.
 */
const UNIQUE_EMAIL_GUARDS = [
  { model: 'Partner', field: 'email', label: 'hồ sơ đối tác' },
  { model: 'PartnerMember', field: 'email', label: 'thành viên đối tác' },
  { model: 'EventReminder', field: 'email', label: 'đăng ký nhắc sự kiện' },
];

/**
 * Kiểm tra email mới có đụng dữ liệu sẵn có không.
 * Trả về mảng mô tả xung đột (rỗng nghĩa là an toàn).
 */
const findEmailConflicts = async (newEmail) => {
  const conflicts = [];

  for (const guard of UNIQUE_EMAIL_GUARDS) {
    const Model = getModel(guard.model);
    if (!Model) continue;
    const count = await Model.countDocuments({ [guard.field]: newEmail });
    if (count > 0) conflicts.push({ model: guard.model, label: guard.label, count });
  }

  return conflicts;
};

/**
 * Đổi email trên toàn bộ dữ liệu liên quan.
 *
 * @param {string} oldEmail  email cũ (đã chuẩn hóa chữ thường)
 * @param {string} newEmail  email mới (đã chuẩn hóa chữ thường)
 * @param {object} options
 * @param {boolean} options.dryRun  chỉ đếm số bản ghi sẽ đổi, không ghi
 * @param {object}  options.session phiên giao dịch mongoose (nếu có)
 * @returns {Promise<{ total: number, details: object[] }>}
 */
const migrateUserEmail = async (oldEmail, newEmail, { dryRun = false, session = null } = {}) => {
  const details = [];
  let total = 0;
  const opts = session ? { session } : {};

  for (const entry of SCALAR_EMAIL_FIELDS) {
    const Model = getModel(entry.model);
    if (!Model) continue;

    for (const field of entry.fields) {
      const filter = { [field]: oldEmail };
      if (dryRun) {
        const count = await Model.countDocuments(filter, opts);
        if (count) { details.push({ model: entry.model, field, count }); total += count; }
        continue;
      }
      const res = await Model.updateMany(filter, { $set: { [field]: newEmail } }, opts);
      if (res.modifiedCount) {
        details.push({ model: entry.model, field, count: res.modifiedCount });
        total += res.modifiedCount;
      }
    }
  }

  for (const entry of ARRAY_EMAIL_FIELDS) {
    const Model = getModel(entry.model);
    if (!Model) continue;

    for (const field of entry.fields) {
      const filter = { [field]: oldEmail };
      if (dryRun) {
        const count = await Model.countDocuments(filter, opts);
        if (count) { details.push({ model: entry.model, field, count }); total += count; }
        continue;
      }
      // $set với toán tử vị trí $ chỉ đổi phần tử khớp, giữ nguyên các email khác
      // trong mảng (một thông báo gửi cho nhiều người).
      const res = await Model.updateMany(
        filter,
        { $set: { [`${field}.$[elem]`]: newEmail } },
        { ...opts, arrayFilters: [{ elem: oldEmail }] },
      );
      if (res.modifiedCount) {
        details.push({ model: entry.model, field, count: res.modifiedCount });
        total += res.modifiedCount;
      }
    }
  }

  return { total, details };
};

module.exports = {
  SCALAR_EMAIL_FIELDS,
  ARRAY_EMAIL_FIELDS,
  INTENTIONALLY_SKIPPED,
  findEmailConflicts,
  migrateUserEmail,
};
