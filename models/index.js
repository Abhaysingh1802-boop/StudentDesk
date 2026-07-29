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

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Otp = mongoose.models.Otp || mongoose.model("Otp", otpSchema);
const Resource = mongoose.models.Resource || mongoose.model("Resource", resourceSchema);

module.exports = { User, Otp, Resource };
