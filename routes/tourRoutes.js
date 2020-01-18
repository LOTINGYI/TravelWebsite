const express = require('express')

const router = express.Router()
const { getAllTours, createTour, getTour, updateTour, deleteTour, aliasTopTours}
    = require('../controllers/tourController')



// Create a checkBody middleware
// Check if body contains the name and price property
// If not, send back 400 (bad request)
// Add it to the post handler stack

// This way is better

router.route('/top-5-cheap').get(aliasTopTours, getAllTours)
router
    .route('/')
    .get(getAllTours)
    .post(createTour)
router
    .route('/:id')
    .get(getTour)
    .patch(updateTour)
    .delete(deleteTour)

module.exports = router
