const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { secret } = require("../../../config/db");

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please include your name"]
    },

    email: {
        type: String,
        required: [true, "Please include your email"]
    },

    password: {
        type: String,
        required: [true, "Please include your password"]
    },

    wins: {
        type: Number,
        default: 0,
        required: true
    },

    points: {
        type: Number,
        default: 0,
        required: true
    },

    tokens: [
        {
            token: {
                type: String,
                required: true
            }
        }
    ]
});

// This method will hash the password before saving the user model
userSchema.pre("save", async function(next) {
    const user = this;
    if (user.isModified("password")) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    next();
});

// This method generates an auth token for the user
userSchema.methods.generateAuthToken = async function() {
    const user = this;
    const token = jwt.sign({
        _id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        wins: user.wins
    },
    secret);
    user.tokens = user.tokens.concat({token});
    await user.save();
    return token;
}

userSchema.statics.findByCredentials = async (email, password) => {

    const user = await User.findOne({ email });
    if(!user) {
        throw new Error({ error: "Email not found" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if(!isPasswordMatch) {
        throw new Error({error: "Password doesnt match"})
    }

    return user;
}

const User = mongoose.model("User", userSchema);
module.exports = User;