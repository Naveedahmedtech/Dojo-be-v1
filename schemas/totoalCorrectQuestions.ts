const mongoose = require("mongoose");
import { Schema, model, Document, Types } from "mongoose";

export interface ITotalCorrectQuestion extends Document {
  user_ref: Types.ObjectId;
  chapter_ref: Types.ObjectId;
  correct_questions: any[];
  counts: number;
  mode: string;
  date: Date;
}

const TotalCorrectQuestionSchema: Schema<ITotalCorrectQuestion> =
  new Schema<ITotalCorrectQuestion>(
    {
      user_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      counts: { type: Number, default: 0 },
      mode: { type: String, required: true },
      date: { type: Date, required: true },
      chapter_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
      },
      correct_questions: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: "Question", 
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

const TotalCorrectQuestions = model<ITotalCorrectQuestion>(
  "TotalCorrectQuestions",
  TotalCorrectQuestionSchema
);

export default TotalCorrectQuestions;
