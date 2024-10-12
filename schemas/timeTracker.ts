import mongoose, { Schema, Document } from "mongoose";

// Schema for storing time spent on each question
interface IChapterTime extends Document {
  chapter_ref: mongoose.Types.ObjectId;
  user_ref: mongoose.Types.ObjectId;
  time_spent: string;
  mode: string; 

}

const ChapterTimeSchema: Schema = new Schema({
  chapter_ref: {
    type: Schema.Types.ObjectId,
    ref: "Chapter",
    required: true,
  },
  user_ref: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
  time_spent: { type: String, default: 0 },
  mode: { type: String}
});

export const ChapterTime = mongoose.model<IChapterTime>("ChapterTime", ChapterTimeSchema);



// Schema for storing time spent on each subject
interface ISubjectTime extends Document {
  subject_ref: mongoose.Types.ObjectId;
  user_ref: mongoose.Types.ObjectId;
  total_time: string; 
  mode: string; 
}

const SubjectTimeSchema: Schema = new Schema({
  subject_ref: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
  user_ref: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
  total_time: { type: String, default: 0 },
  mode: { type: String}
});

export const SubjectTime = mongoose.model<ISubjectTime>(
  "SubjectTime",
  SubjectTimeSchema
);
