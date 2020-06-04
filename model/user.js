var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var findOrCreate = require('mongoose-findorcreate');
var bcrypt = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
    apikey: String,
    token: String,
    googleId: String,
    facebookId: String,
    firstName: String,
    lastName: String,
    lastLogin: Date,
})

// generating a hash
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.generateToken = function () {
    return bcrypt.hashSync(Date.now, bcrypt.genSaltSync(8), null);
}
//generate api key
userSchema.methods.generateApikey = function (email) {
    return bcrypt.hashSync(email, 10);
}

// checking if password is valid
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

module.exports = mongoose.model('User', userSchema);