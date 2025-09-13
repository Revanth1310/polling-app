// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { authMiddleware } from "./middleware/auth.js";
import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";

const app = express();
const prisma = new PrismaClient();

// Create HTTP + Socket.io server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }  // Allow any client for now
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

/* ---------------- USER REGISTRATION ---------------- */
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Invalid data" });
  }
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash }
    });
    res.json({ message: "User created successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/* ---------------- USER LOGIN ---------------- */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } //Session expires in 1h
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ---------------- CREATE POLL ---------------- */
app.post("/polls", authMiddleware, async (req, res) => {
  const { question, options } = req.body;
  try {
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ error: "Poll must have a question and at least 2 options" });
    }
    const poll = await prisma.poll.create({
      data: {
        question,
        isPublished: true,
        creatorId: req.user.id,
        options: { create: options.map((text) => ({ text })) }
      },
      include: { options: true }
    });
    res.json(poll);
  } catch (err) {
    console.error("Error creating poll:", err);
    res.status(500).json({ error: "Error creating poll" });
  }
});

/* ---------------- GET ALL POLLS ---------------- */
app.get("/polls", async (req, res) => {
  const polls = await prisma.poll.findMany({
    include: { options: { include: { votes: true } } }
  });
  res.json(polls);
});

/* ---------------- VOTE ---------------- */
app.post("/polls/:id/vote", authMiddleware, async (req, res) => {
  try {
    const pollId = parseInt(req.params.id);
    const { optionId } = req.body;
    const userId = req.user.id;

    // Check if option belongs to this poll
    const option = await prisma.pollOption.findFirst({
      where: { id: optionId, pollId }
    });
    if (!option) return res.status(400).json({ error: "Invalid option for this poll" });

    // Check if user already voted
    const existingVote = await prisma.vote.findFirst({
      where: { userId, pollOption: { pollId } }
    });
    if (existingVote) return res.status(400).json({ error: "User already voted" });

    // Create vote
    await prisma.vote.create({
      data: { userId, pollOptionId: option.id }
    });

    // Fetch updated results
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: { include: { votes: true } } }
    });

    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    const results = poll.options.map(opt => ({
      option: opt.text,
      votes: opt.votes.length,
      percentage: totalVotes === 0 ? 0 : ((opt.votes.length / totalVotes) * 100).toFixed(2)
    }));

    // 🔥 Broadcast updated results in real time
    io.to(`poll_${pollId}`).emit("pollUpdated", {
      pollId,
      question: poll.question,
      totalVotes,
      results
    });

    res.json({ message: "Vote recorded" });

  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ error: "Error voting" });
  }
});


/* ---------------- GET ALL VOTES ---------------- */
app.get("/votes", authMiddleware, async (req, res) => {
  try {
    const votes = await prisma.vote.findMany({
      include: {
        user: true,
        pollOption: { include: { poll: true } }
      }
    });
    res.json(votes.map(v => ({
      voteId: v.id,
      user: v.user.name,
      pollQuestion: v.pollOption.poll.question,
      chosenOption: v.pollOption.text
    })));
  } catch (err) {
    console.error("Error fetching votes:", err);
    res.status(500).json({ error: "Error fetching votes" });
  }
});

/* ---------------- MY POLLS ---------------- */
app.get("/mypolls", authMiddleware, async (req, res) => {
  try {
    const myPolls = await prisma.poll.findMany({
      where: { creatorId: req.user.id },
      include: { options: { include: { votes: true } } }
    });
    res.json(myPolls);
  } catch (err) {
    console.error("Error fetching my polls:", err);
    res.status(500).json({ error: "Error fetching your polls" });
  }
});

/* ---------------- POLL RESULTS ---------------- */
app.get("/polls/:id/results", async (req, res) => {
  const pollId = parseInt(req.params.id);
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: { include: { votes: true } } }
    });
    if (!poll) return res.status(404).json({ error: "Poll not found" });

    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    const results = poll.options.map(opt => ({
      option: opt.text,
      votes: opt.votes.length,
      percentage: totalVotes === 0 ? 0 : ((opt.votes.length / totalVotes) * 100).toFixed(2)
    }));

    res.json({ question: poll.question, totalVotes, results });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ error: "Error fetching results" });
  }
});

/* ---------------- SOCKET.IO ---------------- */
io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    // Join specific poll room
    socket.on("joinPoll", (pollId) => {
        socket.join(`poll_${pollId}`);
        console.log(`🟢 Client ${socket.id} joined poll_${pollId}`);
    });

    // When a vote is cast, broadcast updated results
    socket.on("voteCast", (pollId, updatedResults) => {
        io.to(`poll_${pollId}`).emit("pollUpdated", updatedResults);
        console.log(`📢 Broadcasted update for poll ${pollId}`);
    });

    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});


/* ---------------- START SERVER ---------------- */
const PORT = 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
