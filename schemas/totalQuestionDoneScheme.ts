const mongoose = require("mongoose");
import { Schema, model, Document, Types } from "mongoose";

export interface ITotalQuestionDone extends Document {
  user_ref: Types.ObjectId;
  total_questions_done: number;
  mode: string;
  date: Date;
}

const TotalQuestionDoneSchema: Schema<ITotalQuestionDone> =
  new Schema<ITotalQuestionDone>(
    {
      user_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      total_questions_done: { type: Number, default: 0 },
      mode: { type: String, required: true },
      date: { type: Date, required: true },
    },
    {
      timestamps: true,
    }
  );

const TotalQuestionDone = model<ITotalQuestionDone>(
  "TotalQuestionDone",
  TotalQuestionDoneSchema
);

export default TotalQuestionDone;
