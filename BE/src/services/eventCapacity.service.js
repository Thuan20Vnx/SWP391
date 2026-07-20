const Event = require('../models/Event');
const Payment = require('../models/Payment');

/**
 * Quản lý sức chứa sự kiện bằng thao tác atomic của MongoDB.
 *
 * Vì sao cần: luồng cũ đọc `registeredCount` rồi mới ghi ở câu lệnh khác
 * (check-then-act). Hai request đồng thời cùng đọc được số cũ nên cùng vượt
 * qua kiểm tra và cùng ghi, dẫn tới bán vượt sức chứa. Mọi hàm dưới đây gộp
 * kiểm tra + tăng/giảm vào MỘT lệnh findOneAndUpdate, nên MongoDB tuần tự hóa
 * chúng trên cùng một document và chỉ đúng một request thắng chỗ cuối cùng.
 *
 * Hai loại chỗ:
 *  - registeredCount: chỗ đã chốt (vé miễn phí, hoặc vé phí đã trả tiền).
 *  - reservedCount:   chỗ đang giữ tạm cho đơn thanh toán pending.
 * Sức chứa còn lại = capacity - (registeredCount + reservedCount).
 */

// Điều kiện "còn chỗ", tính cả chỗ đang giữ tạm.
// Giữ nguyên ngữ nghĩa cũ: capacity = 0 nghĩa là hết chỗ (không phải vô hạn).
const HAS_FREE_SLOT = {
  $expr: {
    $lt: [
      { $add: ['$registeredCount', { $ifNull: ['$reservedCount', 0] }] },
      { $ifNull: ['$capacity', 0] },
    ],
  },
};

/** Trả lại một chỗ đã chốt. Điều kiện > 0 chặn counter tụt xuống âm nếu bị gọi thừa. */
const releaseOccupiedSlot = async (eventId) =>
  Event.findOneAndUpdate(
    { _id: eventId, registeredCount: { $gt: 0 } },
    { $inc: { registeredCount: -1 } },
    { returnDocument: 'after' },
  );

/** Nhả một chỗ đang giữ tạm. */
const releaseReservedSlot = async (eventId) =>
  Event.findOneAndUpdate(
    { _id: eventId, reservedCount: { $gt: 0 } },
    { $inc: { reservedCount: -1 } },
    { returnDocument: 'after' },
  );

/**
 * Đóng một đơn pending và nhả chỗ nó đang giữ, đảm bảo chỉ nhả đúng một lần.
 *
 * Việc lật cờ slotReserved true -> false là atomic, nên dù hết-hạn-lười, hủy đơn,
 * webhook và bộ dọn dưới đây có chạy chồng nhau thì cũng chỉ một luồng lọt vào.
 *
 * @returns {Promise<boolean>} true nếu chính lần gọi này đã nhả chỗ.
 */
const closePendingAndReleaseSlot = async (paymentId, nextStatus) => {
  const claimed = await Payment.findOneAndUpdate(
    { _id: paymentId, slotReserved: true },
    { $set: { slotReserved: false, status: nextStatus } },
    { returnDocument: 'after' },
  );

  if (!claimed) {
    // Đơn không giữ chỗ (đơn cũ tạo trước khi có cơ chế này, hoặc đã nhả rồi):
    // chỉ cập nhật trạng thái, không đụng tới counter của sự kiện.
    await Payment.updateOne(
      { _id: paymentId, status: 'pending' },
      { $set: { status: nextStatus } },
    );
    return false;
  }

  await releaseReservedSlot(claimed.event);
  return true;
};

/**
 * Nhả chỗ của mọi đơn pending đã quá hạn của một sự kiện.
 *
 * Hệ thống không có cron dọn đơn; lazyExpire chỉ chạy khi người mua còn mở trang
 * và poll trạng thái. Người bỏ dở giữa chừng sẽ giữ chỗ vô thời hạn, nên bộ dọn
 * này được gọi ngay trước khi báo "hết chỗ" — chỉ tốn thêm truy vấn ở đúng thời
 * điểm sự kiện có vẻ đã đầy, thay vì chạy nền liên tục.
 *
 * @returns {Promise<number>} Số chỗ thực sự được nhả.
 */
const sweepExpiredReservations = async (eventId) => {
  const stale = await Payment.find({
    event: eventId,
    status: 'pending',
    slotReserved: true,
    expiresAt: { $lte: new Date() },
  }).select('_id');

  let released = 0;
  for (const payment of stale) {
    // eslint-disable-next-line no-await-in-loop
    const didRelease = await closePendingAndReleaseSlot(payment._id, 'expired');
    if (didRelease) released += 1;
  }
  return released;
};

/**
 * Chạy một thao tác giành chỗ; nếu hết chỗ thì dọn đơn quá hạn và thử lại đúng một lần.
 * Chỉ thử lại khi bộ dọn thực sự giải phóng được chỗ, tránh lặp vô ích.
 */
const withSweepRetry = async (eventId, claim) => {
  const first = await claim();
  if (first) return first;

  const released = await sweepExpiredReservations(eventId);
  if (!released) return null;

  return claim();
};

/**
 * Chiếm một chỗ đã chốt (vé miễn phí — đăng ký xong là có chỗ ngay).
 * @returns {Promise<object|null>} Event sau khi tăng, hoặc null nếu đã hết chỗ.
 */
const occupySlot = async (eventId) =>
  withSweepRetry(eventId, () =>
    Event.findOneAndUpdate(
      { _id: eventId, ...HAS_FREE_SLOT },
      { $inc: { registeredCount: 1 } },
      { returnDocument: 'after' },
    ),
  );

/**
 * Giữ tạm một chỗ cho đơn thanh toán pending.
 * @returns {Promise<object|null>} Event sau khi giữ, hoặc null nếu đã hết chỗ.
 */
const reserveSlot = async (eventId) =>
  withSweepRetry(eventId, () =>
    Event.findOneAndUpdate(
      { _id: eventId, ...HAS_FREE_SLOT },
      { $inc: { reservedCount: 1 } },
      { returnDocument: 'after' },
    ),
  );

/**
 * Chuyển một chỗ đang giữ tạm thành chỗ đã chốt (webhook báo đã nhận tiền).
 *
 * Không kiểm tra sức chứa ở đây: chỗ đã được giữ từ lúc checkout và tiền đã vào,
 * nên từ chối lúc này đồng nghĩa thu tiền mà không giao vé.
 *
 * @param {boolean} hadReservation Đơn có thực sự đang giữ chỗ hay không. Với đơn
 *   cũ tạo trước khi có cơ chế reserve, ta vẫn phải ghi nhận chỗ vì tiền đã nhận.
 */
const commitReservedSlot = async (eventId, hadReservation) => {
  if (hadReservation) {
    const updated = await Event.findOneAndUpdate(
      { _id: eventId, reservedCount: { $gt: 0 } },
      { $inc: { registeredCount: 1, reservedCount: -1 } },
      { returnDocument: 'after' },
    );
    if (updated) return updated;
    // Chỗ giữ đã biến mất (ví dụ bộ dọn nhả trước khi webhook về).
    // Tiền đã nhận nên vẫn phải cấp chỗ, dù có thể vượt sức chứa.
    console.warn(`[EventCapacity] Đơn đã trả tiền nhưng mất chỗ giữ, cấp bù cho event ${eventId}`);
  }
  return Event.findOneAndUpdate({ _id: eventId }, { $inc: { registeredCount: 1 } }, { returnDocument: 'after' });
};

module.exports = {
  occupySlot,
  releaseOccupiedSlot,
  reserveSlot,
  releaseReservedSlot,
  commitReservedSlot,
  closePendingAndReleaseSlot,
  sweepExpiredReservations,
};
