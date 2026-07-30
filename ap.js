const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const User = require("./models/User");
JWT_SECRET = process.env.JWT_SECRET;
app.use(express.json());

async function startServer() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/authdb");
        console.log("MongoDB Connected");

        app.listen(3000, () => {
            console.log("Server running on port 3000");
        });
    } catch (err) {
        console.log(err);
    }
}

startServer();
const { User, Resource } = require("./models");git 
module.exports = mongoose.model("Resource", resourceSchema);
async function callAddResource(resource) {
    const res = await fetch("http://localhost:3000/AddResource", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(resource)
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to add resource");
    }

    return data;
}
