const mongoose = require("mongoose");
import { Schema, model, Document, Types } from "mongoose";

export interface IUserChapterProgress extends Document {
  user_ref: Types.ObjectId;
  chapter_ref: Types.ObjectId;
  total_questions_done: number;
  mode: string;
}

const UserChapterProgressSchema: Schema<IUserChapterProgress> =
  new Schema<IUserChapterProgress>({
    user_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chapter_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    total_questions_done: { type: Number, default: 0 },
    mode: { type: String, required: true },
  });

const UserChapterProgress = model<IUserChapterProgress>(
  "UserChapterProgress",
  UserChapterProgressSchema
);

export default UserChapterProgress;
