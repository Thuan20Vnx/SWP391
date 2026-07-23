const Club = require('../models/Club');
const ClubChangeRequest = require('../models/ClubChangeRequest');
const { formatClubChangeRequest } = require('../utils/clubChangeRequestFormat');
const AppError = require('../utils/AppError');

const buildClubSnapshot = (club) => ({
  name: club.name,
  category: club.category,
  description: club.description || '',
  president: club.president || '',
  email: club.email || '',
  hotline: club.hotline || '',
  status: club.status,
});

const listChangeRequests = async ({ status = 'pending', type, clubId } = {}) => {
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  // Yêu cầu 'transfer' do IC-PDP duyệt riêng (/api/clubs/transfer-requests),
  // không đưa vào danh sách Admin duyệt sửa/xóa CLB.
  if (type && type !== 'all') filter.requestType = type;
  else filter.requestType = { $in: ['edit', 'delete'] };
  if (clubId) filter.clubId = clubId;

  const rows = await ClubChangeRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(200);

  const clubIds = [...new Set(rows.map((r) => String(r.clubId)))];
  const clubs = await Club.find({ _id: { $in: clubIds } });
  const clubMap = new Map(clubs.map((c) => [String(c._id), c]));

  return {
    requests: rows.map((r) => formatClubChangeRequest(r, clubMap.get(String(r.clubId)))),
  };
};

const getChangeRequestById = async (id) => {
  const row = await ClubChangeRequest.findById(id);
  if (!row) throw new AppError('Không tìm thấy yêu cầu!', 404);
  const club = await Club.findById(row.clubId);
  return { request: formatClubChangeRequest(row, club) };
};

const applyApprovedChange = async (request, club) => {
  if (request.requestType === 'delete') {
    club.status = 'inactive';
    await club.save();
    return;
  }

  // Ô bỏ trống trong đề xuất nghĩa là "không đổi" — payload subdoc luôn default ''
  // nên không được ghi đè giá trị rỗng (description rỗng còn làm Club validation
  // nổ "Path `description` is required").
  const patch = request.payload || {};
  if (patch.name?.trim()) club.name = patch.name.trim();
  if (patch.category?.trim()) club.category = patch.category.trim();
  if (patch.description?.trim()) club.description = patch.description.trim();
  if (patch.president?.trim()) club.president = patch.president.trim();
  if (patch.email?.trim()) club.email = patch.email.trim();
  if (patch.hotline?.trim()) club.hotline = patch.hotline.trim();
  await club.save();
};

const approveChangeRequest = async (id, { adminNote, processorEmail }) => {
  const request = await ClubChangeRequest.findById(id);
  if (!request) throw new AppError('Không tìm thấy yêu cầu!', 404);
  if (request.requestType === 'transfer') {
    throw new AppError('Yêu cầu chuyển nhượng do IC-PDP duyệt, không qua luồng này.', 400);
  }
  if (request.status !== 'pending') {
    throw new AppError('Yêu cầu đã được xử lý!', 400);
  }

  const club = await Club.findById(request.clubId);
  if (!club) throw new AppError('CLB gốc không tồn tại!', 404);

  await applyApprovedChange(request, club);

  request.status = 'approved';
  request.adminNote = adminNote || '';
  request.processedByEmail = processorEmail || '';
  await request.save();

  return { request: formatClubChangeRequest(request, club) };
};

const rejectChangeRequest = async (id, { adminNote, processorEmail }) => {
  const request = await ClubChangeRequest.findById(id);
  if (!request) throw new AppError('Không tìm thấy yêu cầu!', 404);
  if (request.status !== 'pending') {
    throw new AppError('Yêu cầu đã được xử lý!', 400);
  }

  request.status = 'rejected';
  request.adminNote = adminNote || '';
  request.processedByEmail = processorEmail || '';
  await request.save();

  const club = await Club.findById(request.clubId);
  return { request: formatClubChangeRequest(request, club) };
};

/**
 * Sửa "nhỏ" (chủ nhiệm hiển thị, email liên hệ, hotline, mô tả) không cần Admin
 * duyệt — chỉ đổi tên CLB / lĩnh vực mới phải qua Admin.
 */
const isMinorEditOnly = (club, payload = {}) => {
  const nameChanged = Boolean(payload.name?.trim()) && payload.name.trim() !== (club.name || '');
  const categoryChanged =
    Boolean(payload.category?.trim()) && payload.category.trim() !== (club.category || '');
  return !nameChanged && !categoryChanged;
};

const createChangeRequest = async (user, clubId, body) => {
  const { requestType, reason, payload } = body;

  if (!clubId || !requestType) {
    throw new AppError('Thiếu thông tin yêu cầu!', 400);
  }
  if (!['edit', 'delete'].includes(requestType)) {
    throw new AppError('Loại yêu cầu không hợp lệ!', 400);
  }
  if (!reason?.trim()) {
    throw new AppError('Vui lòng nhập lý do yêu cầu!', 400);
  }

  const club = await Club.findById(clubId);
  if (!club) throw new AppError('Không tìm thấy câu lạc bộ!', 404);
  if (club.status === 'inactive') throw new AppError('CLB đã bị xóa!', 400);

  const pendingExists = await ClubChangeRequest.findOne({
    clubId: club._id,
    status: 'pending',
  });
  if (pendingExists) {
    throw new AppError('Đã có yêu cầu đang chờ xử lý cho CLB này!', 400);
  }

  // Sửa thông tin liên hệ / mô tả: áp dụng ngay, lưu bản ghi đã duyệt để truy vết,
  // Admin chỉ nhận thông báo.
  if (requestType === 'edit' && isMinorEditOnly(club, payload)) {
    const row = await ClubChangeRequest.create({
      clubId: club._id,
      requestType,
      status: 'approved',
      reason: reason.trim(),
      payload: payload || {},
      snapshot: buildClubSnapshot(club),
      requestedByEmail: user.email,
      requestedByName: user.fullname || '',
      adminNote: 'Tự động áp dụng — thay đổi thông tin liên hệ không cần Admin duyệt.',
      processedByEmail: user.email,
    });
    await applyApprovedChange(row, club);
    return {
      message: 'Đã cập nhật thông tin CLB — thay đổi liên hệ áp dụng ngay, không cần Admin duyệt.',
      request: formatClubChangeRequest(row, club),
      autoApplied: true,
    };
  }

  const row = await ClubChangeRequest.create({
    clubId: club._id,
    requestType,
    reason: reason.trim(),
    payload: requestType === 'edit' ? payload || {} : {},
    snapshot: buildClubSnapshot(club),
    requestedByEmail: user.email,
    requestedByName: user.fullname || '',
  });

  return {
    message: 'Đã gửi yêu cầu. Admin sẽ xử lý sớm nhất.',
    request: formatClubChangeRequest(row, club),
  };
};

module.exports = {
  listChangeRequests,
  getChangeRequestById,
  approveChangeRequest,
  rejectChangeRequest,
  createChangeRequest,
};
