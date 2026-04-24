const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

console.log("🚀 SERVER FILE RUNNING");

// ---------------- CORS ----------------
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://automationhub-frontend.vercel.app",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// ---------------- MongoDB Models ----------------
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpires: Date,
});

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  email: String,
  phone: String,
  message: String,
  sentAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// ---------------- MongoDB Connection ----------------
let isDBConnected = false;

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
  })
  .then(() => {
    console.log("✅ MongoDB Connected");
    isDBConnected = true;
  })
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ---------------- Nodemailer ----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ---------------- API Routes ----------------

// TEST
app.get("/api", (req, res) => {
  res.send("API working");
});

// USERS
app.get("/api/users", async (req, res) => {
  console.log("🔥 USERS API HIT");
  try {
    const users = await User.find();
    res.send(users);
  } catch (err) {
    console.log("❌ USERS ERROR:", err);
    res.status(500).send(err.message);
  }
});

// ---------------- SIGNUP (OTP) ----------------
app.post("/api/signup", async (req, res) => {
  if (!isDBConnected) {
    return res.status(503).send("Server waking up, try again");
  }

  try {
    let { firstName, lastName, email, password } = req.body;

    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.trim().toLowerCase();
    password = password.trim();

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).send("All fields are required");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).send("User already exists");
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Create user (not verified)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      otp,
      otpExpires: Date.now() + 5 * 60 * 1000,
    });

    // ✅ Send OTP email
    try {
      await transporter.sendMail({
        from: `"AutomationHub" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify your email",
        html: `
          <h2>OTP Verification</h2>
          <p>Your OTP is:</p>
          <h1>${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
        `,
      });

      console.log("✅ OTP Email sent");
    } catch (err) {
      console.log("❌ EMAIL ERROR:", err.message);
    }

    res.send({ message: "Signup successful. Verify OTP." });
  } catch (err) {
    console.log("❌ SIGNUP ERROR:", err);
    res.status(500).send(err.message);
  }
});

// ---------------- VERIFY OTP ----------------
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(404).send("User not found");
    if (user.otp !== otp) return res.status(400).send("Invalid OTP");
    if (user.otpExpires < Date.now())
      return res.status(400).send("OTP expired");

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.send({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ---------------- LOGIN ----------------
app.post("/api/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email.trim().toLowerCase();
    password = password.trim();

    const user = await User.findOne({ email });

    if (!user) return res.status(404).send("User not found");

    // ✅ Must verify first
    if (!user.isVerified) {
      return res.status(400).send("Please verify your email first");
    }

    if (user.password !== password)
      return res.status(400).send("Wrong password");

    res.send({ message: "Login successful", user });
  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
});

// DELETE USERS
app.delete("/api/delete-users", async (req, res) => {
  try {
    const result = await User.deleteMany({});
    res.json({
      message: "All users deleted",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
});

// STATIC FRONTEND
app.use(express.static(path.join(__dirname, "build")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
