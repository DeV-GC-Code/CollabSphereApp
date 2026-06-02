import "dotenv/config";
import express from "express";
import cors from "cors";
import spheresRouter from "./routes/spheres.js";

const app = express();
const PORT = process.env.PORT || 8009;

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));
app.use(express.json());

app.get("/actuator/health", (_req, res) => res.json({ status: "UP" }));

// Routes — gateway strips /api/v1/spheres, so paths here are /core/...
app.use("/core", spheresRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[error]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[spheres-service] Listening on :${PORT}`);
});
