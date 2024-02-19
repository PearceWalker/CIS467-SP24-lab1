const express = require("express");

const app = express();
const PORT = 3000;
const mysql = require("mysql2/promise");
const config = require("./config");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool(config.db);

app.listen(PORT, async () => {
  const host = process.env.HOSTNAME || "http://localhost";
  console.log(`Listening on ${host}:${PORT}`);
});

app.use((req, res, next) => {
  req.user = { id: 4, name: "Kenan" }
  next()
});

app.get("/", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    console.log(req.user);
    const [users] = await conn.query("SELECT * FROM users");

    conn.release();
    //console.log(users)

    res.json(users);
  } catch (err) {
    res.json({ message: "error" });
    console.error(err);
  }
});

app.get("/tags", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    console.log(req.user);
    const [tags] = await conn.query("SELECT * FROM tags");

    conn.release();
    //console.log(users)

    res.json(tags);
  } catch (err) {
    res.json({ message: "error" });
    console.error(err);
  }
});

app.get("/tags/:id", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    console.log(req.user);
    const [tags] = await conn.query(
      "SELECT * FROM tags WHERE tagID=" + req.params.id
    );

    conn.release();
    //console.log(users)

    if (tags.length > 0) {
      res.json(tags[0]);
    } else {
      res.status(404).json({ message: "Resource not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "error" });
    console.error(err);
  }
});

// Create a new user
app.post("/tags", async (req, res) => {
  const { tagDescription } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.query("INSERT INTO tags (tagDescription) VALUES (?)", [
      tagDescription,
    ]);
    const [newTag] = await connection.query(
      "SELECT * FROM tags WHERE tagDescription=?",
      [tagDescription]
    );
    connection.release();
    res.status(201).json(newTag[0]);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).send("Error creating user");
  }
});

app.get("/api/v1/prayers", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [prayers] = await conn.query("SELECT * FROM prayers");
    conn.release();
    res.json(prayers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET a specific prayer by ID
app.get("/api/v1/prayers/:id", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [prayers] = await conn.query(
      "SELECT * FROM prayers WHERE id = ?",
      [req.params.id]
    );
    conn.release();
    if (prayers.length > 0) {
      res.json(prayers[0]);
    } else {
      res.status(404).json({ message: "Prayer not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST a new prayer
app.post("/api/v1/prayers", async (req, res) => {
  const { prompt, body, coverImage, audioRecitation, aiCreator, creators, scriptures, tags, likes, saves } = req.body;
  try {
    const conn = await pool.getConnection();
    const result = await conn.query(
      "INSERT INTO prayers (prompt, body, coverImage, audioRecitation, aiCreator, creators, scriptures, tags, likes, saves) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [prompt, body, coverImage, audioRecitation, aiCreator, JSON.stringify(creators), JSON.stringify(scriptures), JSON.stringify(tags), likes, saves]
    );
    const insertedId = result[0].insertId;
    const [newPrayer] = await conn.query(
      "SELECT * FROM prayers WHERE id = ?",
      [insertedId]
    );
    conn.release();
    res.status(201).json(newPrayer[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT update a prayer by ID
app.put("/api/v1/prayers/:id", async (req, res) => {
  const { prompt, body, coverImage, audioRecitation, aiCreator, creators, scriptures, tags, likes, saves } = req.body;
  try {
    const conn = await pool.getConnection();
    await conn.query(
      "UPDATE prayers SET prompt = ?, body = ?, coverImage = ?, audioRecitation = ?, aiCreator = ?, creators = ?, scriptures = ?, tags = ?, likes = ?, saves = ? WHERE id = ?",
      [prompt, body, coverImage, audioRecitation, aiCreator, JSON.stringify(creators), JSON.stringify(scriptures), JSON.stringify(tags), likes, saves, req.params.id]
    );
    conn.release();
    res.status(200).json({ message: "Prayer updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE a prayer by ID
app.delete("/api/v1/prayers/:id", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.query("DELETE FROM prayers WHERE id = ?", [req.params.id]);
    conn.release();
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/v1/prayers/:id/likes", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [likes] = await conn.query("SELECT * FROM likes WHERE prayerID = ?", [req.params.id]);
    conn.release();
    res.json(likes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST like a prayer with given ID
app.post("/api/v1/prayers/:id/likes", async (req, res) => {
  const { userID } = req.body;
  try {
    const conn = await pool.getConnection();
    // Check if the like already exists
    const [existingLikes] = await conn.query("SELECT * FROM likes WHERE prayerID = ? AND userID = ?", [req.params.id, userID]);
    if (existingLikes.length > 0) {
      res.status(409).json({ message: "Like already exists" });
      return;
    }
    // Insert the like
    await conn.query("INSERT INTO likes (prayerID, userID) VALUES (?, ?)", [req.params.id, userID]);
    conn.release();
    res.status(201).json({ message: "Like created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE unlike a prayer with given ID
app.delete("/api/v1/prayers/:id/likes", async (req, res) => {
  const { userID } = req.body;
  try {
    const conn = await pool.getConnection();
    // Delete the like
    await conn.query("DELETE FROM likes WHERE prayerID = ? AND userID = ?", [req.params.id, userID]);
    conn.release();
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET all saves of a prayer by ID
app.get("/api/v1/prayers/:id/saves", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [saves] = await conn.query("SELECT * FROM saves WHERE prayerID = ?", [req.params.id]);
    conn.release();
    res.json(saves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/v1/prayers/:id/saves", async (req, res) => {
  const { userID } = req.body;
  try {
    const conn = await pool.getConnection();
    const [existingSaves] = await conn.query("SELECT * FROM saves WHERE prayerID = ? AND userID = ?", [req.params.id, userID]);
    if (existingSaves.length > 0) {
      res.status(409).json({ message: "Save already exists" });
      return;
    }
    // Insert the save
    await conn.query("INSERT INTO saves (prayerID, userID) VALUES (?, ?)", [req.params.id, userID]);
    conn.release();
    res.status(201).json({ message: "Save created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE unsave a prayer with given ID
app.delete("/api/v1/prayers/:id/saves", async (req, res) => {
  const { userID } = req.body;
  try {
    const conn = await pool.getConnection();
    // Delete the save
    await conn.query("DELETE FROM saves WHERE prayerID = ? AND userID = ?", [req.params.id, userID]);
    conn.release();
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});



