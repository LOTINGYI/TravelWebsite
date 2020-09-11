const multer = require('multer')
const sharp = require('sharp')


const Tour = require('../models/tourModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const Factory = require('../controllers/handlerFactory')
const APIFeatures = require('../utils/apiFeatures')


const multerStorage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true)
    } else {
        cb(new AppError('Not an image! Please upload only image!', 400), false)
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 }
])

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    // console.log(req.files)
    if (!(req.files.imageCover || req.files.images)) {
        return next()
    }

    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`

    // 1) Cover images
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`)

    // 2) images
    req.body.images = []
    await Promise.all(
        req.files.images.map(async (file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}-cover.jpeg`

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`)
            req.body.images.push(filename)
        })
    )

    next()
})

// in the router.params callback
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5'
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,difficulty'
    next()
}

exports.getAllTours = Factory.getAll(Tour)

exports.getTour = Factory.getOne(Tour, { path: 'reviews' })

exports.createTour = Factory.createOne(Tour)

exports.updateTour = Factory.updateOne(Tour)

exports.deleteTour = Factory.deleteOne(Tour)

// Aggregation pipeline
exports.getTourStats = catchAsync(async (req, res, next) => {

    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                // _id: '$ratingsAverage',
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        },
        {
            $sort: {
                avgPrice: 1 // -1 is descending
            }
        }
    ])

    res.status(200).json({
        status: 'success',
        data: {
            stats
        }
    })

})

// Addressing the real business problem
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {

    const year = req.params.year * 1    // 2021

    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                tours: { $push: '$name' }
            }
        },
        {
            $addFields: {
                month: '$_id'
            }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: { numTourStarts: -1 }
        }
    ])

    res.status(200).json({
        status: 'success',
        data: {
            plan
        }
    })
})

// /tours-distance?distance=233&center=-40,45&unit=mi
// /tours-distance/233/center/34.177093, -118.094534/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params

    const [lat, lng] = latlng.split(',')

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1

    if (!lat || !lng) {
        next(new AppError('Please provide latitude and longitude in the format like lat,lng', 400))
    }

    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    })


    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    })
})

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params
    const [lat, lng] = latlng.split(',')
    const multiplier = unit === 'mi' ? 0.000621371 : 0.001

    if (!lat || !lng) {
        next(new AppError('Please provide latitude and longitude in the format like lat,lon', 400))
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]  // *1 convert to number
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ])

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    })
})