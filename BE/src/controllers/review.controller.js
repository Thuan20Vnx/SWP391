const reviewService = require('../services/review.service');

const submitReview = async (req, res) => {
  const result = await reviewService.submitReview(req.user._id, req.params.id, req.body);
  res.status(201).json({ success: true, ...result });
};

module.exports = {
  submitReview,
};
