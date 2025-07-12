const express = require("express");
const session = require("express-session");
const passport = require("./config/passport");
const connectToDb = require("./config/connectToDB");
require('dotenv').config();

connectToDb();
const app = express();

// Trust proxy (important for getting real IP addresses in production)
app.set('trust proxy', true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Importing routes
app.use("/api/auth", require("./routes/authRoute"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});