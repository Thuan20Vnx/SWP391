const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventReview = require('../models/EventReview');
const AppError = require('../utils/AppError');

const formatEventDate = (event) => {
  const start = new Date(event.startDate);
  if (Number.isNaN(start.getTime())) return '';
  return start.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatPendingItem = (registration) => {
  const event = registration.event;
  if (!event || typeof event !== 'object') return null;

  return {
    id: String(event._id),
    eventId: String(event._id),
    registrationId: String(registration._id),
    title: event.title,
    date: formatEventDate(event),
    tags: [`#${event.category}`],
    image: event.thumbnail,
  };
};

const formatCompletedItem = (review) => {
  const event = review.event;
  if (!event || typeof event !== 'object') return null;

  return {
    id: String(review._id),
    eventId: String(event._id),
    title: event.title,
    date: formatEventDate(event),
    rating: review.rating,
    comment: review.comment || '',
    tags: [`#${event.category}`],
    image: event.thumbnail,
    reviewedAt: review.createdAt,
  };
};

const isEligibleForReview = (registration, now = new Date()) => {
  if (!registration?.event) return false;
  if (registration.status === 'cancelled') return false;
  if (registration.status === 'attended') return true;
  if (registration.status === 'registered') {
    const end = new Date(registration.event.endDate);
    return !Number.isNaN(end.getTime()) && end < now;
  }
  return false;
};

const updateEventRatingStats = async (eventId) => {
  const stats = await EventReview.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(String(eventId)) } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = stats[0]?.avg ?? 0;
  const count = stats[0]?.count ?? 0;

  await Event.findByIdAndUpdate(eventId, {
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: count,
  });
};

const getEventReviews = async (userId, { tab = 'pending' } = {}) => {
  const now = new Date();

  const registrations = await EventRegistration.find({ user: userId })
    .populate('event')
    .sort({ registeredAt: -1 });

  const eligible = registrations.filter((r) => isEligibleForReview(r, now));
  const eligibleEventIds = eligible.map((r) => r.event._id);

  const existingReviews = await EventReview.find({
    user: userId,
    event: { $in: eligibleEventIds },
  }).select('event');

  const reviewedEventIds = new Set(existingReviews.map((r) => String(r.event)));

  const pending = eligible
    .filter((r) => !reviewedEventIds.has(String(r.event._id)))
    .map(formatPendingItem)
    .filter(Boolean);

  const completedReviews = await EventReview.find({ user: userId })
    .populate('event')
    .sort({ createdAt: -1 });

  const completed = completedReviews.map(formatCompletedItem).filter(Boolean);

  const counts = { pending: pending.length, completed: completed.length };

  if (tab === 'completed') {
    return { items: completed, counts };
  }

  return { items: pending, counts };
};

const getEventRatingStats = async (eventId) => {
  const event = await Event.findById(eventId).select('title averageRating reviewCount').lean();
  if (!event) {
    throw new AppError('Không tìm thấy sự kiện!', 404);
  }

  const eventObjectId = new mongoose.Types.ObjectId(String(eventId));

  const [distributionAgg, reviews] = await Promise.all([
    EventReview.aggregate([
      { $match: { event: eventObjectId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    EventReview.find({ event: eventId })
      .populate('user', 'fullname email studentId')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
  ]);

  const countByStar = Object.fromEntries(distributionAgg.map((row) => [row._id, row.count]));
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: countByStar[stars] || 0,
  }));

  const reviewCount = event.reviewCount ?? reviews.length;
  const averageRating = Number(event.averageRating) || 0;

  const mapReview = (r) => ({
    id: String(r._id),
    rating: r.rating,
    comment: r.comment || '',
    authorName: r.user?.fullname || r.user?.email || 'Sinh viên',
    authorEmail: r.user?.email || '',
    studentId: r.user?.studentId || '',
    createdAt: r.createdAt,
  });

  return {
    eventId: String(eventId),
    title: event.title,
    averageRating,
    reviewCount,
    distribution,
    reviews: reviews.map(mapReview),
    recentReviews: reviews.slice(0, 8).map(mapReview),
  };
};

const submitReview = async (userId, eventId, { rating, comment }) => {
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new AppError('Đánh giá phải từ 1 đến 5 sao.', 400);
  }

  const registration = await EventRegistration.findOne({
    user: userId,
    event: eventId,
  }).populate('event');

  if (!isEligibleForReview(registration)) {
    throw new AppError('Bạn chỉ có thể đánh giá sự kiện đã tham gia hoặc đã kết thúc.', 403);
  }

  const existing = await EventReview.findOne({ user: userId, event: eventId });
  if (existing) {
    throw new AppError('Bạn đã đánh giá sự kiện này rồi.', 409);
  }

  const review = await EventReview.create({
    user: userId,
    event: eventId,
    rating: ratingNum,
    comment: (comment || '').trim(),
  });

  if (registration.status === 'registered') {
    registration.status = 'attended';
    await registration.save();
  }

  await updateEventRatingStats(eventId);

  const populated = await EventReview.findById(review._id).populate('event');

  return {
    message: 'Cảm ơn bạn! Đánh giá đã được gửi.',
    review: formatCompletedItem(populated),
  };
};

const updateReview = async (userId, eventId, { rating, comment }) => {
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new AppError('Đánh giá phải từ 1 đến 5 sao.', 400);
  }

  const review = await EventReview.findOne({ user: userId, event: eventId });
  if (!review) {
    throw new AppError('Bạn chưa đánh giá sự kiện này.', 404);
  }

  review.rating = ratingNum;
  review.comment = (comment || '').trim();
  await review.save();

  await updateEventRatingStats(eventId);

  const populated = await EventReview.findById(review._id).populate('event');

  return {
    message: 'Đã cập nhật đánh giá của bạn.',
    review: formatCompletedItem(populated),
  };
};

module.exports = {
  getEventReviews,
  getEventRatingStats,
  submitReview,
  updateReview,
  isEligibleForReview,
};
