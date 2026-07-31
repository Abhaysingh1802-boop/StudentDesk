const express = require("express");
const { Resource, User } = require("./models");
const { auth, adminOnly } = require("./middlewares/auth");
const { patch } = require("./signup.js");

const router = express.Router();
router.get("/Resource/data/:date", auth, async (req, res) => {
    try {
        const start = new Date(`${req.params.date}T00:00:00.000+05:30`);
        const end = new Date(`${req.params.date}T23:59:59.999+05:30`);

        if (Number.isNaN(start.getTime())) {
            return res.status(400).json({ message: "Use date format: YYYY-MM-DD" });
        }

        const resources = await Resource.find({
            createdAt: { $gte: start, $lte: end },
            isActive: true,
        }).sort({ createdAt: -1 });

        return res.json({ resources });
    }
    catch (error) {
        return res.status(400).json({ message: "use date format : YYYY-MM--DD" });
    }
})


module.exports = router;
