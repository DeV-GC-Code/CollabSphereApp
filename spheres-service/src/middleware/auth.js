import jwt from "jsonwebtoken";

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
    // RBAC: trust the signed `role` claim issued by user-service. Do NOT decide admin
    // by comparing emails here (that was never a real authorization model). Tokens issued
    // before the role claim existed simply get no admin rights (safe default).
    req.isAdmin = payload.role === "ADMIN";
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
