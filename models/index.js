const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email:
    {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
  },
  { timestamps: true }
);

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300
  },
});

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ["hall", "equipment", "room", "other"],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    openTime: {
      type: String,
      required: true
    },
    closeTime: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed", index: true },
    purpose: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true }
);

bookingSchema.index({ resource: 1, date: 1, startTime: 1, endTime: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Otp = mongoose.models.Otp || mongoose.model("Otp", otpSchema);
const Resource = mongoose.models.Resource || mongoose.model("Resource", resourceSchema);
const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

module.exports = { User, Otp, Resource, Booking };
