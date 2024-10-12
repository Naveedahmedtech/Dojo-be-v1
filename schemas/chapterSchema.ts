import { Schema, model, Document, Types } from 'mongoose';
import { IQuestion } from "./questionSchema";
import { ISubject } from './subjectSchema';

interface IChapter extends Document {
  university_ref: Types.ObjectId;
  class_ref: Types.ObjectId;
  subject_ref: Types.ObjectId | ISubject; 
  chapter_name: string;
  is_available: boolean;
  number_of_questions: number;
  questions_ref: Types.ObjectId[]; 
  total_question_done: number;
}

const chapterSchema = new Schema<IChapter>({
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
  subject_ref: {
    type: Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  chapter_name: {
    type: String,
    required: true,
  },
  is_available: {
    type: Boolean,
    required: true,
  },
  number_of_questions: {
    type: Number,
    default: 0,
  },
  total_question_done: {
    type: Number,
    default: 0,
  },
  questions_ref: [
    {
      type: Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
});

chapterSchema.pre<IChapter>('save', function (next) {
  this.number_of_questions = this.questions_ref.length;
  next();
});

chapterSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    await doc.updateOne({ number_of_questions: doc.questions_ref.length });
  }
});

const Chapter = model<IChapter>('Chapter', chapterSchema);
export { Chapter, IChapter };
