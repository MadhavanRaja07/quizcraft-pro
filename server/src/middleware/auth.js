import jwt from "jsonwebtoken";

export function sign(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET ?? "dev",
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  );
}

export function authRequired(req, _res, next) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next({ status: 401, message: "Missing token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET ?? "dev");
    next();
  } catch {
    next({ status: 401, message: "Invalid token" });
  }
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next({ status: 403, message: "Forbidden" });
  next();
};
