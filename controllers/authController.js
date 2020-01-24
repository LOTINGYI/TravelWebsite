const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')

const signToken = id => {
    return jwt.sign({ id: id }
        , process.env.JWT_SECRET
        , { expiresIn: process.env.JWT_EXPIRES_IN })
}


exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create(req.body)

    const token = signToken(newUser._id)

    res.status(201).json({
        status: 'success',
        token,
        data: {
            user: newUser
        }
    })
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body


    // 1) check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400))
    }
    // 2) check if user exists && password is correct
    const user = await User.findOne({ email: email }).select('+password')
    // console.log(user)
    const correct = await user.correctPassword(password, user.password)

    if (!user || !correct) {
        return next(new AppError('Incorrect email or password', 401))
    }

    // 3) If everthing ok, send token to client
    const token = signToken(user._id)
    res.status(200).json({
        status: 'success',
        token
    })
})


exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check of it's there
    let token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]
    }
    // console.log(token)
    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access!', 401))
    }
    // 2) Verfication token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    // console.log(decoded)    // Example: { id: '5e2947c92d13083fe0d7dead', iat: 1579770175, exp: 1579770225 }

    // 3) Check if user still exists
    const freshUser = await User.findById(decoded.id)
    if (!freshUser) {
        return next(new AppError('The token belonging to this user does no longer exists', 401))
    }


    // 4) Check if user change password after the JWT was issued
    if (freshUser.changesPasswordAfter(decoded.iat)) {
        return next(new AppError('User Recently changed Password! Please log in again.', 401))
    }

    // Grant access to protected route
    req.user = freshUser

    next()
})


// wrapper function
exports.restrictTo = (...roles) => {
    // because the closure have access to roles
    return (req, res, next) => {
        // roles ['admin','lead-guide']. role='user'
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        next()
    }
}