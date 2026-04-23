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

// ---------------- MongoDB Connection (FIXED) ----------------
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

// SIGNUP (FIXED)
app.post("/api/signup", async (req, res) => {
  // ✅ Prevent DB not ready error
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

    const user = await User.create({ firstName, lastName, email, password });

    // EMAIL
    try {
      await transporter.sendMail({
        from: `"AutomationHub" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome 🚀",
        html: `
  <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
    <div style="max-width:500px; margin:auto; background:white; padding:25px; border-radius:10px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
      
      <h2 style="color:#4F46E5; margin-bottom:10px;">
        Welcome to AutomationHub 🚀
      </h2>

      <p style="font-size:16px; color:#333;">
        Hi <b>${firstName}</b>,
      </p>

      <p style="color:#555; line-height:1.5;">
        Your account has been successfully created.<br/>
        Start exploring experts and automate your workflows easily.
      </p>

      <a href="https://automationhub-frontend.vercel.app"
         style="display:inline-block; margin-top:20px; padding:12px 20px; background:#4F46E5; color:white; text-decoration:none; border-radius:6px; font-weight:bold;">
         Open AutomationHub
      </a>

      <p style="margin-top:25px; font-size:12px; color:#999;">
        If you didn’t create this account, you can safely ignore this email.
      </p>

    </div>
  </div>
`,
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
