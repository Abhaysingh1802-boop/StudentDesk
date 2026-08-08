const express = require("express");
const { Resource, Booking } = require("./models");
const { auth } = require("./middlewares/auth");

const router = express.Router();
const timeToMinutes = (time) => {
  const match = /^(\d{2}):(\d{2})$/.exec(time || "");
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : NaN;
};
const isValidDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date || "") && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());

router.get("/catalog/resources", auth, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.search) filter.$or = [
      { name: { $regex: req.query.search.trim(), $options: "i" } },
      { location: { $regex: req.query.search.trim(), $options: "i" } },
      { category: { $regex: req.query.search.trim(), $options: "i" } },
    ];
    if (req.query.category && req.query.category !== "all") filter.category = req.query.category;
    const resources = await Resource.find(filter).sort({ name: 1 });
    res.json({ resources });
  } catch (error) { res.status(500).json({ message: "Unable to load resources" }); }
});

router.get("/resources/:id/availability", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) return res.status(400).json({ message: "A valid date is required" });
    const resource = await Resource.findOne({ _id: req.params.id, isActive: true });
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    const bookings = await Booking.find({ resource: resource._id, date, status: "confirmed" }).select("startTime endTime");
    res.json({ resource, bookings });
  } catch (error) { res.status(400).json({ message: "Unable to check availability" }); }
});

router.post("/bookings", auth, async (req, res) => {
  try {
    const { resourceId, date, startTime, endTime, purpose = "" } = req.body;
    const start = timeToMinutes(startTime), end = timeToMinutes(endTime);
    if (!resourceId || !isValidDate(date) || Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      return res.status(400).json({ message: "Provide a resource, valid date, and valid time range" });
    }
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const currentTime = timeToMinutes(new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }));
    if (date < today || (date === today && start <= currentTime)) return res.status(400).json({ message: "Choose a time in the future" });
    const resource = await Resource.findOne({ _id: resourceId, isActive: true });
    if (!resource) return res.status(404).json({ message: "Resource is unavailable" });
    if (start < timeToMinutes(resource.openTime) || end > timeToMinutes(resource.closeTime)) {
      return res.status(400).json({ message: `Choose a time between ${resource.openTime} and ${resource.closeTime}` });
    }
    const conflicts = await Booking.find({ resource: resource._id, date, status: "confirmed" }).select("startTime endTime");
    if (conflicts.some((booking) => start < timeToMinutes(booking.endTime) && end > timeToMinutes(booking.startTime))) {
      return res.status(409).json({ message: "This time slot has already been booked" });
    }
    const booking = await Booking.create({ user: req.user._id, resource: resource._id, date, startTime, endTime, purpose });
    await booking.populate("resource", "name location category");
    res.status(201).json({ message: "Booking confirmed", booking });
  } catch (error) { res.status(400).json({ message: error.message || "Unable to create booking" }); }
});

router.get("/bookings/me", auth, async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.status !== "all") filter.status = "confirmed";
    const bookings = await Booking.find(filter).populate("resource", "name location category").sort({ date: 1, startTime: 1 });
    res.json({ bookings });
  } catch (error) { res.status(500).json({ message: "Unable to load bookings" }); }
});

router.patch("/bookings/:id/cancel", auth, async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: "confirmed" }, { status: "cancelled" }, { new: true });
    if (!booking) return res.status(404).json({ message: "Active booking not found" });
    res.json({ message: "Booking cancelled", booking });
  } catch (error) { res.status(400).json({ message: "Unable to cancel booking" }); }
});

router.get("/dashboard", auth, async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const [resources, upcoming, total] = await Promise.all([
      Resource.countDocuments({ isActive: true }),
      Booking.find({ user: req.user._id, status: "confirmed", date: { $gte: today } }).populate("resource", "name location category").sort({ date: 1, startTime: 1 }).limit(5),
      Booking.countDocuments({ user: req.user._id, status: "confirmed" }),
    ]);
    res.json({ resources, upcoming, total });
  } catch (error) { res.status(500).json({ message: "Unable to load dashboard" }); }
});

module.exports = router;
