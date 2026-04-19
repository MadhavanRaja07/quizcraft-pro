import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 255 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["faculty", "student"], required: true },
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function () {
  return { id: this._id.toString(), name: this.name, email: this.email, role: this.role, createdAt: this.createdAt };
};

export const User = mongoose.model("User", userSchema);
