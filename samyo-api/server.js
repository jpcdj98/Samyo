require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES = process.env.JWT_EXPIRES || "2h";

app.use(cors());
app.use(express.json());

// In-memory "database". Replace with a real DB later (users are lost on restart).
const users = [
  { id: 1, name: "Demo Customer", email: "demo@samyo.ph", passwordHash: bcrypt.hashSync("Samyo123!", 10), role: "customer" }
];

const emailOk = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const signToken = (u) => jwt.sign({ sub: u.id, role: u.role }, SECRET, { expiresIn: EXPIRES });

// Middleware: requires "Authorization: Bearer <token>"
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.auth = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// POST /api/auth/register  { name, email, password }
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !emailOk(email) || typeof password !== "string" || password.length < 8)
    return res.status(400).json({ error: "Name, a valid email and a password of 8+ characters are required." });
  const key = email.toLowerCase();
  if (users.some((u) => u.email === key)) return res.status(409).json({ error: "Email already registered." });
  const user = { id: users.length + 1, name, email: key, passwordHash: bcrypt.hashSync(password, 10), role: "customer" };
  users.push(user);
  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

// POST /api/auth/login  { email, password }
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!emailOk(email) || typeof password !== "string" || !password)
    return res.status(400).json({ error: "Email and password are required." });
  const user = users.find((u) => u.email === email.toLowerCase());
  // Same message for unknown email and wrong password, so attackers can't tell which was wrong.
  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: "Invalid email or password." });
  res.json({ user: publicUser(user), token: signToken(user) });
});

// GET /api/auth/me  (protected)
app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.auth.sub);
  if (!user) return res.status(401).json({ error: "User no longer exists." });
  res.json({ user: publicUser(user) });
});

// Serve the front end from the sibling folder, so http://localhost:3000/login.html works.
app.use(express.static(path.join(__dirname, "..", "samyo-frontend")));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => console.log("Samyo running at http://localhost:" + PORT));
