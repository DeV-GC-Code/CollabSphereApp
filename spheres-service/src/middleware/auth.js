import jwt from "jsonwebtoken";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = Number(payload.sub);
    req.userEmail = payload.email;
    req.userName = payload.name || payload.email;
    req.isAdmin = payload.email === ADMIN_EMAIL;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
