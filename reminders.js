const mongoose = require("mongoose");
const { Resend } = require("resend");
const { Booking } = require("./models");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Tracks which bookings already got a reminder email, without touching the Booking schema.
const ReminderLog =
  mongoose.models.ReminderLog ||
  mongoose.model(
    "ReminderLog",
    new mongoose.Schema({
      booking: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
      sentAt: { type: Date, default: Date.now },
    })
  );

// date: "YYYY-MM-DD", time: "HH:MM" — both stored in Asia/Kolkata local time.
function toKolkataDate(date, time) {
  return new Date(`${date}T${time}:00.000+05:30`);
}

async function sendBookingReminders() {
  if (!resend) return;

  try {
    const now = Date.now();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const tomorrow = new Date(now + 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const bookings = await Booking.find({ status: "confirmed", date: { $in: [today, tomorrow] } })
      .populate("user", "name email")
      .populate("resource", "name location");

    for (const booking of bookings) {
      if (!booking.user?.email) continue;

      const startsAt = toKolkataDate(booking.date, booking.startTime).getTime();
      const minutesUntilStart = (startsAt - now) / 60000;

      // Checked every 5 min, so a 15-min window guarantees at least one hit per booking.
      if (minutesUntilStart > 60 || minutesUntilStart <= 45) continue;

      const alreadySent = await ReminderLog.exists({ booking: booking._id });
      if (alreadySent) continue;

      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "StudentDesk <otp@abhhunt.in>",
        to: booking.user.email,
        subject: `Reminder: ${booking.resource?.name || "Your booking"} starts in 1 hour`,
        html: `
          <h1>Upcoming booking reminder</h1>
          <p>Hi ${booking.user.name || "there"},</p>
          <p>Your booking for <strong>${booking.resource?.name || "a resource"}</strong>${
          booking.resource?.location ? ` at ${booking.resource.location}` : ""
        } starts today at <strong>${booking.startTime}</strong> — about an hour from now.</p>
          ${booking.purpose ? `<p>Purpose: ${booking.purpose}</p>` : ""}
        `,
      });

      if (error) {
        console.error("Reminder email failed:", error.message);
        continue;
      }

      await ReminderLog.create({ booking: booking._id }).catch(() => {});
    }
  } catch (err) {
    console.error("Reminder check failed:", err.message);
  }
}

function startReminderScheduler() {
  sendBookingReminders();
  setInterval(sendBookingReminders, 5 * 60 * 1000);
}

module.exports = { startReminderScheduler };