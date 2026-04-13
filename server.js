const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ✅ DEBUG LOG (VERY IMPORTANT)
console.log("🚀 SERVER FILE RUNNING");

// ---------------- CORS ----------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// ---------------- MongoDB Models ----------------
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
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

// ---------------- Connect MongoDB ----------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log(err));

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

// ✅ TEST ROUTE
app.get("/api", (req, res) => {
  console.log("✅ /api HIT");
  res.send("API working");
});

// ✅ GET USERS (IMPORTANT DEBUG)
app.get("/api/users", async (req, res) => {
  console.log("🔥 USERS API HIT");
  try {
    const users = await User.find();
    res.send(users);
  } catch (err) {
    res.status(500).send("Error fetching users");
  }
});

// ---------------- Signup ----------------
app.post("/api/signup", async (req, res) => {
  try {
    let { firstName, lastName, email, password } = req.body;

    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.trim().toLowerCase();
    password = password.trim();

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).send("All fields are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).send("Invalid email format");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).send("User already exists");
    }

    const user = await User.create({ firstName, lastName, email, password });

    // ✅ Send Email
    try {
      const frontendURL =
        process.env.FRONTEND_URL ||
        "https://your-vercel-link.vercel.app";

      const emailHTML = `
      <div style="font-family: Arial; background:#f4f4f4; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; padding:30px; border-radius:10px;">
          
          <h2 style="color:#4F46E5; text-align:center;">Welcome to AutomationHub 🚀</h2>
          
          <p>Hello <b>${firstName}</b>,</p>
          <p>Your account has been successfully created.</p>

          <div style="text-align:center; margin:30px;">
            <a href="${frontendURL}" 
               style="background:#4F46E5; color:white; padding:12px 20px; text-decoration:none; border-radius:6px;">
              Open App
            </a>
          </div>

          <p>${frontendURL}</p>

        </div>
      </div>
      `;

      const info = await transporter.sendMail({
        from: `"AutomationHub" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to AutomationHub 🚀",
        html: emailHTML,
      });

      console.log("✅ Email sent:", info.response);
    } catch (err) {
      console.log("❌ EMAIL ERROR:", err.message);
    }

    res.send({ message: "Signup successful", user });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

// ---------------- Login ----------------
app.post("/api/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email.trim().toLowerCase();
    password = password.trim();

    const user = await User.findOne({ email });

    if (!user) return res.status(404).send("User not found");
    if (user.password !== password)
      return res.status(400).send("Wrong password");

    res.send({ message: "Login successful", user });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

// ---------------- DELETE USERS ----------------
app.delete("/api/delete-users", async (req, res) => {
  console.log("🔥 DELETE USERS HIT");

  try {
    const result = await User.deleteMany({});

    console.log("🧹 Deleted count:", result.deletedCount);

    return res.json({
      message: "All users deleted",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.log("❌ ERROR:", err.message);
    return res.status(500).send("Error deleting users");
  }
});

// ---------------- Serve React Build ----------------
app.use(express.static(path.join(__dirname, "build")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// ---------------- Start server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
