const { Booking } = require("./models");

const RETENTION_DAYS = 7;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day


function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

async function removeOldBookings() {
  try {
    const cutoff = daysAgo(RETENTION_DAYS);
    const result = await Booking.deleteMany({ date: { $lt: cutoff } });
    if (result.deletedCount) {
      console.log(`Cleanup: removed ${result.deletedCount} booking(s) older than ${cutoff}`);
    }
  } catch (err) {
    console.error("Booking cleanup failed:", err.message);
  }
}

function startCleanupScheduler() {
  removeOldBookings();
  setInterval(removeOldBookings, CHECK_INTERVAL_MS);
}

module.exports = { startCleanupScheduler };