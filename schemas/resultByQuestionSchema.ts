import { Schema, model, Document, Types } from 'mongoose';
import { IResultsByChapter } from './resultsByChapterSchema';
import { IQuestion } from './questionSchema';

interface IResultsByQuestion extends Document {
  results_by_chapter_ref: Types.ObjectId | IResultsByChapter;
  question_ref: Types.ObjectId | IQuestion;
  is_correct: boolean;
  is_not_correct: boolean;
  not_answered_yet: boolean;
  to_fill_user_answer: string;
  exam_fill_user_answer: string;
  time_spent_per_question: string;
  done_by_mode: string;
  date: Date;
  answer_by_learn_mode: string;
  exam_not_answered_yet: boolean;
  is_learn_correct_answers: boolean;
  is_learn_incorrect_answers: boolean;
  learn_not_answered_yet: boolean;
  is_exam_correct_answers: boolean;
  is_exam_incorrect_answers: boolean;
}

const resultsByQuestionSchema = new Schema<IResultsByQuestion>({
  results_by_chapter_ref: {
    type: Schema.Types.ObjectId,
    ref: "ResultsByChapter",
  },
  question_ref: { type: Schema.Types.ObjectId, ref: "Question" },
  is_correct: { type: Boolean },
  is_not_correct: { type: Boolean },
  not_answered_yet: { type: Boolean },
  to_fill_user_answer: { type: String },
  exam_fill_user_answer: { type: String },
  time_spent_per_question: { type: String, default: "00:00:00" },
  done_by_mode: { type: String },
  date: { type: Date, default: Date.now },
  answer_by_learn_mode: { type: String },
  exam_not_answered_yet: { type: Boolean },
  is_learn_correct_answers: { type: Boolean },
  is_learn_incorrect_answers: { type: Boolean },
  learn_not_answered_yet: { type: Boolean },
  is_exam_correct_answers: { type: Boolean },
  is_exam_incorrect_answers: { type: Boolean },
});

resultsByQuestionSchema.pre<IResultsByQuestion>('save', function(next) {
  if (this.is_correct && this.is_not_correct) {
    throw new Error('A question cannot be both correct and incorrect.');
  }
  if (this.is_correct && this.not_answered_yet) {
    throw new Error('A question cannot be both correct and not answered yet.');
  }
  if (this.is_not_correct && this.not_answered_yet) {
    throw new Error('A question cannot be both incorrect and not answered yet.');
  }
  if (!this.is_correct && !this.is_not_correct && !this.not_answered_yet) {
    throw new Error('A question must have at least one of is_correct, is_not_correct, or not_answered_yet set to true.');
  }
  next();
});

const ResultsByQuestion = model<IResultsByQuestion>('ResultsByQuestion', resultsByQuestionSchema);

export { ResultsByQuestion, IResultsByQuestion };
