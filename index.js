require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// Enable CORS
app.use(cors());

// Serve static files (e.g., index.html)
app.use(express.static("public"));

// Enable form and JSON body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// In-memory "database"
let users = []; // Each element: { _id, username, log: [ { description, duration, date } ] }
let nextUserId = 1; // Simple numeric ID generator (for demonstration)

// --- Serve Home Page ---
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// --- Example test endpoint (not required but typically included) ---
app.get("/api/hello", (req, res) => {
  res.json({ greeting: "hello API" });
});

// ------------------------------------------------------------------
// 1) POST /api/users
//    Creates a new user and returns an object { username, _id }
// ------------------------------------------------------------------
app.post("/api/users", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const newUser = {
    _id: String(nextUserId++), // cast to string to match FCC's ID style
    username: username,
    log: []
  };
  users.push(newUser);

  res.json({
    username: newUser.username,
    _id: newUser._id
  });
});

// ------------------------------------------------------------------
// 2) GET /api/users
//    Returns an array of all users [{username, _id}, ...]
// ------------------------------------------------------------------
app.get("/api/users", (req, res) => {
  // Map users to the format that excludes the "log"
  const userSummaries = users.map(user => ({
    username: user.username,
    _id: user._id
  }));
  res.json(userSummaries);
});

// ------------------------------------------------------------------
// 3) POST /api/users/:_id/exercises
//    Adds an exercise to a user and returns:
//    {
//      username, description, duration, date, _id
//    }
//    - If no date is provided, use the current date
//    - date format: "Mon Jan 01 1990" => using date.toDateString()
// ------------------------------------------------------------------
app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  // Find user by _id
  const user = users.find(u => u._id === userId);
  if (!user) {
    return res.json({ error: "User not found" });
  }

  // Validate required fields
  if (!description || !duration) {
    return res.status(400).json({ error: "description and duration are required" });
  }

  // Parse duration into a number
  const durationNum = parseInt(duration);
  if (isNaN(durationNum)) {
    return res.status(400).json({ error: "duration must be a number" });
  }

  // Parse date or use current date
  let exerciseDate;
  if (!date) {
    // If date not provided, use current date
    exerciseDate = new Date();
  } else {
    exerciseDate = new Date(date);
    if (exerciseDate.toString() === "Invalid Date") {
      return res.json({ error: "Invalid Date" });
    }
  }

  const newExercise = {
    description,
    duration: durationNum,
    date: exerciseDate
  };

  // Add to user's log
  user.log.push(newExercise);

  // Construct response
  res.json({
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date.toDateString(),
    _id: user._id
  });
});

// ------------------------------------------------------------------
// 4) GET /api/users/:_id/logs
//    Returns:
//    {
//      username,
//      count,
//      _id,
//      log: [ { description, duration, date }, ... ]
//    }
//    Allows optional query params: from, to, limit
//    - from, to are in yyyy-mm-dd format
//    - limit is an integer
// ------------------------------------------------------------------
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  // Find user
  const user = users.find(u => u._id === userId);
  if (!user) {
    return res.json({ error: "User not found" });
  }

  // Copy the log array
  let filteredLog = [...user.log];

  // Filter by "from" date if provided
  if (from) {
    const fromDate = new Date(from);
    if (fromDate.toString() !== "Invalid Date") {
      filteredLog = filteredLog.filter(entry => entry.date >= fromDate);
    }
  }

  // Filter by "to" date if provided
  if (to) {
    const toDate = new Date(to);
    if (toDate.toString() !== "Invalid Date") {
      filteredLog = filteredLog.filter(entry => entry.date <= toDate);
    }
  }

  // Limit if provided
  let limitNum = parseInt(limit);
  if (!isNaN(limitNum) && limitNum > 0) {
    filteredLog = filteredLog.slice(0, limitNum);
  }

  // Map to required output format
  const logForOutput = filteredLog.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
  }));

  res.json({
    username: user.username,
    count: filteredLog.length,
    _id: user._id,
    log: logForOutput
  });
});

// ------------------------------------------------------------------
// Start the server
// ------------------------------------------------------------------
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
