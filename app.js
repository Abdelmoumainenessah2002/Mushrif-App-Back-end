const express = require("express");
const session = require("express-session");
const MongoStoreLib = require("connect-mongo");
const MongoStore = MongoStoreLib.default || MongoStoreLib;
const passport = require("./config/passport");
const connectToDb = require("./config/connectToDB");
const { initRedis } = require("./config/redis");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const langMiddleware = require("./middlewares/lang.middleware");
const {
  startInvitationExpirationJob,
  stopInvitationExpirationJob,
} = require("./jobs/invitationExpiration.job");

require("dotenv").config({ quiet: true });

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:5500"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

// Language middleware - extracts language from accept-language header
app.use(langMiddleware);

// Session configuration for OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Importing routes
app.use("/api/auth", require("./routes/authRoute"));
app.use("/api/password", require("./routes/passwordRoute"));
app.use("/api/users", require("./routes/userRoute"));
app.use("/api/emails", require("./routes/emailRoute"));
app.use("/api/admin", require("./routes/adminRoute"));
app.use("/api/work/organizations", require("./routes/work/OrganizationRoute"));

const PORT = process.env.PORT || 8000;
let server;
let isShuttingDown = false;

async function startServer() {
  try {
    await connectToDb();
    initRedis();
    startInvitationExpirationJob();

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  const expirationCompletion = stopInvitationExpirationJob();

  if (server) {
    try {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    } catch (error) {
      console.error("Failed to close HTTP server:", error.message);
    }
  }

  await expirationCompletion;
}

process.on("SIGINT", () => shutdown("SIGINT").catch((error) => {
  console.error("Failed to shut down gracefully:", error.message);
}));
process.on("SIGTERM", () => shutdown("SIGTERM").catch((error) => {
  console.error("Failed to shut down gracefully:", error.message);
}));

startServer();
