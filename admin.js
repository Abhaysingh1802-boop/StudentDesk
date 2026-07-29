const express = require("express");
const { Resource, User } = require("./models");
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
    const resources = await Resource.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(20);

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
module.exports = router;
