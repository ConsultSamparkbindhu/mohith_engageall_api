import express from "express";
import api from "./api.js";

const app = express();

app.use("/api", api);   // ⭐ important

const PORT = process.env.PORT || 3002;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});