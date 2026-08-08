const express = require("express");
const { Resource, User, Booking } = require("./models");
const { auth, adminOnly } = require("./middlewares/auth");
const { patch } = require("./signup.js");

const router = express.Router();

router.post("/AddResource", auth, adminOnly, async (req, res) => {
  try {
    const resource = await Resource.create(req.body);

    return res.status(201).json({
      message: "New resource added",
      resource,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});
router.patch("/resource/:id", auth, adminOnly, async (req, res) => {
  try {
    const updatedResource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedResource) {
      return res.status(404).json({
        message: "Resource not found"
      });
    }

    return res.status(200).json({
      message: "Resource updated",
      resource: updatedResource
    });

  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
});
router.delete("/delete/:id", auth, adminOnly, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/resources", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.search) {
      const term = req.query.search.trim();
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { location: { $regex: term, $options: "i" } },
      ];
    }
    if (req.query.category && req.query.category !== "all") {
      filter.category = req.query.category;
    }
// for filtering resources
    const resources = await Resource.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Resources fetched successfully",
      resources,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});

router.get("/admin/dashboard", auth, adminOnly, async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const [resources, bookings, todayBookings, users, recentBookings] = await Promise.all([
      Resource.countDocuments(),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "confirmed", date: today }),
      User.countDocuments({ role: "user" }),
      Booking.find().populate("resource", "name location").populate("user", "name email").sort({ createdAt: -1 }).limit(10),
    ]);
    res.json({ resources, bookings, todayBookings, users, recentBookings });
  } catch (error) { res.status(500).json({ message: "Unable to load admin dashboard" }); }
});

router.get("/admin/bookings", auth, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find().populate("resource", "name location").populate("user", "name email").sort({ date: -1, startTime: -1 });
    res.json({ bookings });
  } catch (error) { res.status(500).json({ message: "Unable to load bookings" }); }
});

router.patch("/admin/bookings/:id/cancel", auth, adminOnly, async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, status: "confirmed" },
      { status: "cancelled" },
      { new: true }
    ).populate("resource", "name location").populate("user", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Active booking not found" });
    }

    return res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    return res.status(400).json({ message: "Unable to cancel booking" });
  }
});
router.get("/AllUsers", auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      message: "Users fetched successfully",
      response: users,
    });
  }
  catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});

router.patch("/users/:id", auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be user or admin." });
    }
// you can't remove your own admin access
    if (req.user._id.toString() === req.params.id && role !== "admin") {
      return res.status(400).json({ message: "You can't remove your own admin access." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("name email role createdAt");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "User updated successfully.", user });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});
module.exports = router;