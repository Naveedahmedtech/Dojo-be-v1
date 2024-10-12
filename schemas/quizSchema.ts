import { Schema, model, Document, Types } from "mongoose";
import { IChapter } from "./chapterSchema";
import { IUser } from "./userSchema";
import { IResultsByChapter } from "./resultsByChapterSchema";

interface IQuiz extends Document {
  chapters_ref: Types.ObjectId[] | IChapter[];
  user_ref: Types.ObjectId | IUser;
  quiz_mode: string;
  date: Date;
  total_time_spent: string;
  results_by_chapter_ref: Types.ObjectId[] | IResultsByChapter[];
  is_exam_mode: boolean;
}

const quizSchema = new Schema<IQuiz>({
  chapters_ref: [{ type: Schema.Types.ObjectId, ref: "Chapter" }],
  user_ref: { type: Schema.Types.ObjectId, ref: "User" },
  quiz_mode: { type: String },
  date: { type: Date, default: Date.now },
  total_time_spent: { type: String, default: "00:00:00" },
  results_by_chapter_ref: [
    { type: Schema.Types.ObjectId, ref: "ResultsByChapter" },
  ],
  is_exam_mode: { type: Boolean },
});

const Quiz = model<IQuiz>("Quiz", quizSchema);

export { Quiz, IQuiz };
