const {NODE_ENV, DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, JWT_SECRET_KEY} = process.env

module.exports = {
    database: NODE_ENV == 'development' ? `mongodb://${DB_HOST}/${DB_NAME}` :
    `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`,
    secret: JWT_SECRET_KEY
}