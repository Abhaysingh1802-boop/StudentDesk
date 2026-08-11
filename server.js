const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const signupRoutes = require("./signup.js");
const adminRoutes = require("./admin.js");
const bookingRoutes = require("./book.js");
const userBookingRoutes = require("./booking.js");
const { startCleanupScheduler } = require("./cleanup.js");
const { startReminderScheduler } = require("./reminders.js");

const app = express();
app.use(express.static(__dirname));
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname));
app.use(express.json());
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    credentials: true,
  })
);
app.use(cookieParser());

app.use(signupRoutes);
app.use(adminRoutes);
app.use(bookingRoutes);
app.use(userBookingRoutes);
app.get("/health", (req, res) => {
  res.json({ message: "StudentDesk API is running" });
});

async function startServer() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/authdb"
    );

    console.log("MongoDB connected");
    startReminderScheduler();
    startCleanupScheduler();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

startServer();