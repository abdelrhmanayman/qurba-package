const Joi = require('@hapi/joi')
const axios = require('axios')

const mobilePattern = /^01[0-2]{1}[0-9]{8}/
const mobile = Joi.string().regex(mobilePattern)
const password = Joi.string()
const username = Joi.string()
const email = Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
const subject = Joi.string()

const generalAPIS = ['getAllStudents', 'getStudentDetails']

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
exports.save = ({ model, many = false, value }) => many ? model.insertMany(value) : new model(value).save()
exports.update = ({ model, one = false, finder = {}, updates = {}, options = {} }) => one ? model.updateOne(finder, updates, options) : model.updateMany(finder, updates, options)
exports.find = ({ model, one = false, aggregation = null, finder = {}, selection = {}, sort = {}, skip = null, limit = null }) =>
    aggregation ?
        model.aggregate(aggregation) :
        one ?
            model.findOne(finder).select(selection).sort(sort) :
            !skip && !limit ?
                model.find(finder).select(selection).sort(sort) :
                model.find(finder).select(selection).sort(sort).skip(skip).limit(limit)

exports.authMiddleware = async (req, res, next) => {
    let api = req.url.split('/').pop()
    isGeneral = generalAPIS.includes(api)
    if (isGeneral) {
        next()
    } else if (req.body && req.body.token) {
        let status = await axios.post('http://loadbalancer:8080/authenticate', {}, { headers: { 'Authorization': "bearer " + req.body.token } })
            .then(({ status, ...rest }) => {
                req.user = rest.data.user
                return status
            }).catch(({ response: { statusCode } }) => statusCode)
        if (status === 200)
            next()
        else
            res.status(401).end("invalid Token")
    } else
        res.status(400).end('No token')
}
