import { Schema, model, Document, Types } from "mongoose";
import { IChapter } from "./chapterSchema";

interface ISubject extends Document {
  university_ref: Types.ObjectId;
  class_ref: Types.ObjectId;
  subject_name: string;
  subject_icon_url: string;
  chapters_ref: (Types.ObjectId | IChapter)[];
  total_question_done: number;
}

const subjectSchema = new Schema<ISubject>({
  university_ref: {
    type: Schema.Types.ObjectId,
    ref: "University",
    required: true,
  },
  class_ref: {
    type: Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },
  subject_name: {
    type: String,
    required: true,
  },
  subject_icon_url: {
    type: String,
    required: true,
  },
  total_question_done: {
    type: Number,
    default: 0,
  },
  chapters_ref: [
    {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
    },
  ],
});

const Subject = model<ISubject>("Subject", subjectSchema);

export { Subject, ISubject };
