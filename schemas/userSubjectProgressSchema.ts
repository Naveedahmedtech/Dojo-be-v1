const mongoose = require("mongoose");
import { Schema, model, Document, Types } from "mongoose";

export interface IUserSubjectProgress extends Document {
  user_ref: Types.ObjectId;
  subject_ref: Types.ObjectId;
  total_questions_done: number;
}

const userSubjectProgressSchema: Schema<IUserSubjectProgress> =
  new Schema<IUserSubjectProgress>({
    user_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    total_questions_done: { type: Number, default: 0 },
  });

const UserSubjectProgress = model<IUserSubjectProgress>(
  "UserSubjectProgress",
  userSubjectProgressSchema
);

export default UserSubjectProgress;
