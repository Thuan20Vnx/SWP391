const reviewService = require('../services/review.service');

const submitReview = async (req, res) => {
  const result = await reviewService.submitReview(req.user._id, req.params.id, req.body);
  res.status(201).json({ success: true, ...result });
};

const updateReview = async (req, res) => {
  const result = await reviewService.updateReview(req.user._id, req.params.id, req.body);
  res.status(200).json({ success: true, ...result });
};

const getEventRatingStats = async (req, res) => {
  const stats = await reviewService.getEventRatingStats(req.params.id);
  res.json({ success: true, stats });
};

module.exports = {
  submitReview,
  updateReview,
  getEventRatingStats,
};
