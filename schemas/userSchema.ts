import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { IClass } from "./classSchema";
import { IQuiz } from "./quizSchema";
import { IUniversity } from "./universitySchema";

export interface IUser extends Document {
  first_name: string;
  last_name: string;
  email: string;
  passwordHashed: string;
  role: string;
  university_ref: Types.ObjectId | IUniversity;
  classes_ref?: Types.ObjectId[] | IClass[];
  quizzes_ref?: Types.ObjectId[] | IQuiz[];
  total_question_done: number;
}

const userSchema: Schema<IUser> = new Schema<IUser>({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHashed: { type: String, required: true },
  role: { type: String, required: true },
  university_ref: {
    type: Schema.Types.ObjectId,
    ref: "University",
    required: true,
  },
  classes_ref: [{ type: Schema.Types.ObjectId, ref: "Class" }],
  quizzes_ref: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
  total_question_done: { type: Number },
});

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre<IUser>("save", async function (next) {
  if (this.isModified("passwordHashed")) {
    this.passwordHashed = await bcrypt.hash(this.passwordHashed, 10);
  }
  next();
});

const User = model<IUser>("User", userSchema);

export default User;
