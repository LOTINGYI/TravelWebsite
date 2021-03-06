const Review = require('../models/reviewModel')
const Factory = require('../controllers/handlerFactory')
const catchAsync = require('../utils/catchAsync')

// Middleware
exports.setTourUserId = (req, res, next) => {
    // Allow nested routes
    if (!req.body.tour) req.body.tour = req.params.tourId
    if (!req.body.user) req.body.user = req.user.id
    next()
}


exports.createReview = Factory.createOne(Review)
exports.getAllReviews = Factory.getAll(Review)
exports.getReview = Factory.getOne(Review)
exports.updateReview = Factory.updateOne(Review)
exports.deleteReview = Factory.deleteOne(Review)