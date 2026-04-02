const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.all("*", (_req, res) => {
  res.status(404).json({ error: "not found" });
});

module.exports = app;
