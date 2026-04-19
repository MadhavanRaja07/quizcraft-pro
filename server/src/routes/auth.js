import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { authRequired, sign } from "../middleware/auth.js";

const router = Router();

const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(100),
  role: z.enum(["faculty", "student"]),
});
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

router.post("/signup", async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) return next({ status: 409, message: "Email already in use" });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({ ...data, email: data.email.toLowerCase(), passwordHash });
    res.json({ token: sign(user), user: user.toPublic() });
  } catch (err) { next(err); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return next({ status: 401, message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return next({ status: 401, message: "Invalid credentials" });
    res.json({ token: sign(user), user: user.toPublic() });
  } catch (err) { next(err); }
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return next({ status: 404, message: "Not found" });
    res.json(user.toPublic());
  } catch (err) { next(err); }
});

router.patch("/me", authRequired, async (req, res, next) => {
  try {
    const patch = z.object({ name: z.string().trim().min(2).max(100).optional(), email: z.string().email().max(255).optional() }).parse(req.body);
    const user = await User.findByIdAndUpdate(req.user.sub, patch, { new: true });
    res.json(user.toPublic());
  } catch (err) { next(err); }
});

router.post("/change-password", authRequired, async (req, res, next) => {
  try {
    const { current, next: newPwd } = z.object({ current: z.string(), next: z.string().min(6).max(100) }).parse(req.body);
    const user = await User.findById(req.user.sub);
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) return next({ status: 400, message: "Current password is wrong" });
    user.passwordHash = await bcrypt.hash(newPwd, 10);
    await user.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
