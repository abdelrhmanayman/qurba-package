const Joi = require('@hapi/joi')
const axios = require('axios')

// general apis doesn't need authentication
const generalAPIS = ['getAllStudents', 'getStudentDetails']

// validations variables types
const mobilePattern = /^01[0-2]{1}[0-9]{8}/
const mobile = Joi.string().regex(mobilePattern)
const password = Joi.string()
const username = Joi.string()
const email = Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
const subject = Joi.string()

// validation schemas
let CreateUser = Joi.object({
    username: username.required(),
    email: email.required(),
    mobile: mobile.required()
})

let signUpStudent = Joi.object({
    username: username.required(),
    email: email.required(),
    mobile: mobile.required(),
    password: password.required()
})

let signInStudent = Joi.object({
    id: Joi.alternatives().try(email, mobile),
    password: password.required()
})

let editUser = Joi.object({
    updates: Joi.object({ username, email, mobile }),
    editWho: Joi.alternatives().try(username, mobile)
})

let getStudentDetails = Joi.object({ username: username.required() })

let deleteStudent = Joi.object({ username: username.required() })

let searchStudents = Joi.object({
    page: Joi.number().required(),
    pageLimit: Joi.number().required(),
    search: Joi.object({ username, email, mobile, subject })
})

let verifyStudent = Joi.object({
    id: Joi.string().required(),
    username: username.required()
})


exports.validateCreateUser = student => CreateUser.validate(student)
exports.validateEditUser = student => editUser.validate(student)
exports.valitePhoneNumber = number => mobilePattern.test(number)
exports.validateSignUpStudent = student => signUpStudent.validate(student)
exports.validateSigninStudent = credentials => signInStudent.validate(credentials)
exports.validateGetStudentDetails = username => getStudentDetails.validate(username)
exports.validateDeleteStudent = username => deleteStudent.validate(username)
exports.validateSearchStudents = items => searchStudents.validate(items)
exports.validateVerifyStudent = items => verifyStudent.validate(items)
 // database operations 
exports.save = ({ model, many = false, value }) => many ? model.insertMany(value) : new model(value).save()
exports.deletes = ({ model, one = true, finder = {} }) => one ? model.deleteOne(finder) : model.deleteMany(finder)
exports.update = ({ model, one = false, finder = {}, updates = {}, options = {} }) => one ? model.updateOne(finder, updates, options) : model.updateMany(finder, updates, options)
exports.find = ({ model, one = false, aggregation = null, finder = {}, selection = {}, sort = {}, skip = null, limit = null }) =>
    aggregation ?
        model.aggregate(aggregation) :
        one ?
            model.findOne(finder).select(selection).sort(sort) :
            !skip && !limit ?
                model.find(finder).select(selection).sort(sort) :
                model.find(finder).select(selection).sort(sort).skip(skip).limit(limit)

 // auth middleware to autenticate the token
exports.authMiddleware = async (req, res, next) => {
    let api = req.url.split('/').pop()
    isGeneral = generalAPIS.includes(api)
    if (isGeneral) {
        next()
    } else if (req.headers && req.headers.authorization) {
        let status = await axios.post('http://loadbalancer:8080/authenticate', {}, { headers: req.headers })
            .then(({ status, ...rest }) => {
                req.user = rest.data.user
                return status
            }).catch(err => err)
        if (status === 200)
            next()
        else
            res.status(401).end("invalid Token")
    } else
        res.status(400).end('No token')
}

// student mongodb schema
exports.studentSchema = {
    username: {
        type: String,
        unique: true,
    },
    mobile: {
        type: String,
        unique: true
    },
    password: {
        type: String
    },
    email: {
        type: String,
        required: true
    },
    subject: {
        type: [String],
        default: []
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    facebook: {
        id: { type: String }
    }
}