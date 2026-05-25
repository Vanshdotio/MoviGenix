require("dotenv").config();
const app =  require("./src/app.js");
const connectToDB = require("./src/db/db.js");


connectToDB();

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}

module.exports = app;