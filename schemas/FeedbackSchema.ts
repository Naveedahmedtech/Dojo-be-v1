// models/Feedback.ts
import mongoose, { Schema, Document } from "mongoose";

interface IFeedback extends Document {
  userId: string;
  category: string;
  message: string;
  createdAt: Date;
}

const FeedbackSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    category: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Feedback = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
export default Feedback;
