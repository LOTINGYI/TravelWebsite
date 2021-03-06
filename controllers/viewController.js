const axios = require('axios')

const Tour = require('../models/tourModel')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const Booking = require('../models/bookingModel')


exports.getOverview = catchAsync(async (req, res) => {
    // 1) get tour data from collection
    const tours = await Tour.find();

    // 2) build template

    // 3) render that template using our tour data from 1)
    res.status(200).render('overview', {
        title: 'All Tours',
        tours
    })
})

exports.getHome = catchAsync(async (req, res) => {
    // axios.get('/api/v1/tours/top-5-cheap').then(data=>{
    //     console.log(data)
    // })

    res.status(200).render('heroSection', {
        title: 'Home'
    })
})


exports.getTour = catchAsync(async (req, res, next) => {
    // 1) get the data, for the request tour (including reviews and guides)
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user'
    })

    if (!tour) {
        return next(new AppError('There is no tour found with that name', 404))
    }

    // 2) build template
    // 3) render template using data from 1)
    res.status(200).render('tour', {
        title: 'The Forest Hiker Tour',
        tour
    })
})

exports.getMyTours = async (req, res, next) => {
    // find all bookings
    const bookings = await Booking.find({ user: req.user.id })
    // find tours with the returned ids
    const tourIds = bookings.map(el => el.tour.id)
    const tours = await Tour.find({ _id: { $in: tourIds } })

    res.status(200).render('overview', {
        title: 'My Tours',
        tours
    })
}

exports.getLoginForm = (req, res) => {
    res.status(200).render('login', {
        title: 'Log into your account'
    })
}

exports.getSignupForm = (req, res) => {
    res.status(200).render('signup', {
        title: 'Welcom to tl travel'
    })
}


exports.getAccount = (req, res) => {
    res.status(200).render('account', {
        title: 'Your account'
    })
}

exports.updateUserData = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    }, {
        new: true,
        runValidators: true
    })

    res.status(200).render('account', {
        user: updatedUser
    })

})