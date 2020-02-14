// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose')
const Tour = require('../models/tourModel')

const ReviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review can not be empty']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    tour: {
        type: mongoose.Schema.ObjectId, 
        ref: 'Tour',
        required: [true, 'Review must belong to a tour']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user']
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

ReviewSchema.index({ tour: 1, user: 1 }, { unique: true })


ReviewSchema.pre(/^find/, function (next) {
    // The movie's solution
    // this.populate({
    //     path:'tour',
    //     select: 'name'
    // })
    this.populate({
        path: 'user',
        select: 'name photo'
    })
    // My answer here
    // this.populate({
    //     path:'tour',
    //     select:'-__v'
    // }) 
    // this.populate({
    //     path: 'user',
    //     select:'-__v'
    // })
    next()
})

ReviewSchema.statics.calcAverageRatings = async function (tourId) {
    // console.log('tourId:', tourId)
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRatings: { $avg: '$rating' }
            }
        }
    ])

    // console.log(stats)
    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRatings
        })
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        })
    }

}

// Why we use post
// Because after the document is already saved to the database
// It makes sense to then calculate the average ratings
ReviewSchema.post('save', function () {
    // this point to the current review
    this.constructor.calcAverageRatings(this.tour)
    console.log('constructor:', this.constructor)
})

ReviewSchema.pre(/^findOneAnd/, async function (next) {
    this.r = await this.findOne()
    // console.log('review:',this.r)
    next()
})

ReviewSchema.post(/^findOneAnd/, async function () {
    await this.r.constructor.calcAverageRatings(this.r.tour)
})


const Review = mongoose.model('Review', ReviewSchema)

module.exports = Review


