const express = require("express");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
const { User, Otp } = require("./models");

const router = express.Router();
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
const JWT_SECRET = process.env.JWT_SECRET;

function sendToken(user, res) {
    const token = jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "24h"
        }
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    });

    return token;
}


async function verifyOtp(email, otp) {
    const record = await Otp.findOne({ email: email.toLowerCase(), otp: Number(otp) });
    if (!record) return false;

    await Otp.deleteOne({ _id: record._id });
    return true;
}

router.post("/sendotp", async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        if (!email) return res.status(400).json({ message: "Email is required" });
        if (!resend) return res.status(500).json({ message: "RESEND_API_KEY is missing from .env" });

        const otpCode = Math.floor(100000 + Math.random() * 900000);
        const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "StudentDesk <otp@abhhunt.in>",
            to: email,
            subject: "StudentDesk verification code",
            html: `<h1>Your OTP is ${otpCode}</h1><p>It is valid for five minutes.</p>`,
        });

        if (error) return res.status(500).json({ message: error.message || "Unable to send OTP" });

        await Otp.findOneAndUpdate(
            { email },
            { otp: otpCode, createdAt: new Date() },
            { upsert: true, new: true, runValidators: true }
        );

        return res.json({ message: "OTP sent successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Unable to send OTP" });
    }
});

router.post("/verifyOtp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });

        if (!(await verifyOtp(email, otp))) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        return res.json({ success: true, message: "OTP verified successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Unable to verify OTP" });
    }
});

router.post("/signup", async (req, res) => {
    try {
        const { name, email, otp } = req.body;

        if (!name || !email || !otp) {
            return res.status(400).json({
                message: "Name, email, and OTP are required"
            });
        }

        if (!(await verifyOtp(email, otp))) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        if (await User.exists({ email: email.toLowerCase() })) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const user = await User.create({
            name,
            email: email.toLowerCase()
        });

        sendToken(user, res);

        return res.status(201).json({
            message: "Signup successful",
            user
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Signup failed"
        });
    }
});
router.post("/login", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required"
            });
        }

        if (!(await verifyOtp(email, otp))) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase()
        });

        if (!user) {
            return res.status(404).json({
                message: "User does not exist. Please sign up first."
            });
        }

        sendToken(user, res);

        return res.json({
            message: "Login successful",
            user
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Login failed"
        });
    }
});

module.exports = router;
