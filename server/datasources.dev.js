module.exports = {
  "bookfromhome": {
    "host": "cluster0-nf1ys.mongodb.net",
    "port": 27017,
    // "url": process.env.MONGO_URL,
    "url": process.env.MONGO_URL,
    "database": "bookfromhome",
    "password": process.env.MONGO_PASSWORD,
    "name": "bookfromhome",
    "user": process.env.MONGO_USER,
    "useNewUrlParser": true,
    "connector": "mongodb",
    "allowExtendedOperators": true
  }
}
