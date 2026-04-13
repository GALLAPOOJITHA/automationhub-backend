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
      "https://automationhub-frontend.vercel.app"
    ],
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

// ---------------- MongoDB Connection ----------------
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

// TEST
app.get("/api", (req, res) => {
  res.send("API working");
});

// USERS (FIXED ERROR HANDLING ONLY)
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

// SIGNUP (ONLY ERROR FIXED)
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

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).send("User already exists");
    }

    const user = await User.create({ firstName, lastName, email, password });

    // EMAIL SAFE BLOCK
    try {
      const frontendURL =
        process.env.FRONTEND_URL || "https://automationhub-frontend.vercel.app";

      await transporter.sendMail({
        from: `"AutomationHub" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome 🚀",
        html: `
  <h2>Welcome ${firstName}</h2>
  <p>Your account is created.</p>
  <a href="https://automationhub-frontend.vercel.app" 
     style="display:inline-block;padding:10px 15px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">
     Open App
  </a>
`
      });

      console.log("✅ Email sent");
    } catch (emailErr) {
      console.log("❌ EMAIL ERROR:", emailErr.message);
    }

    res.send({ message: "Signup successful", user });
  } catch (err) {
    console.log("❌ SIGNUP ERROR:", err);
    res.status(500).send(err.message);
  }
});

// LOGIN
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