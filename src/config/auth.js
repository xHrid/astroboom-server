const jwt = require( "jsonwebtoken" );
const { secret } = require("./db");
module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.replace("Bearer ", "");
        console.log(token);
        const decoded = jwt.verify( token, secret );
        req.userData = decoded;
        next();
    } catch( err ) {
        return res.status(401).json({
            message: "Authentication Failed"
        });
    }
};