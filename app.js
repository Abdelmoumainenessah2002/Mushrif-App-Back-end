const express = require("express");
const session = require("express-session");
const passport = require("./config/passport");
const connectToDb = require("./config/connectToDB");
const path = require('path');
const cors = require("cors");
const langMiddleware = require("./middlewares/lang.middleware");

require('dotenv').config();

connectToDb();
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Language middleware - extracts language from accept-language header
app.use(langMiddleware);

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

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Importing routes
app.use("/api/auth", require("./routes/authRoute"));
app.use("/api/password", require("./routes/passwordRoute"));
app.use("/api/users", require("./routes/userRoute"));
app.use("/api/emails", require("./routes/emailRoute"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});