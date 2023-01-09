const User = require("../model/User");

exports.registerNewUser = async (req, res) => {
    try {
        let isUser = await User.find({ email: req.body.email });
        console.log(isUser)
        if (isUser.length > 0) {
            return res.status(409).json({
                message: "email already is use"
            });
        }
        const user = new User({
            name: req.body.name,
            email : req.body.email,
            password : req.body.password
        });

        let data = await user.save();
        const token = await user.generateAuthToken();

        res.status(201).json( {data, token});
    } catch(err) {
        res.status(400).json({err : err.message});
    }
};

exports.loginUser = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const user = await User.findByCredentials(email, password);

        if (!user) {
            return res.status(401).json({
                error: "Login Failed! Check credentials"
            });
        }

        const token = await user.generateAuthToken();
        res.status(201).json({ user, token });

    } catch (err) {
        res.status(400).json({ err: err });
    }
};

exports.getUserDetails = async (req, res) => {
    await res.json(req.userData);
};

exports.getAllUsers = async (req, res) => {

    const users = await User.find({}, { name: true, wins: true, points: true }).sort( {points:-1} ).limit(10);
    res.json(users);
    
}