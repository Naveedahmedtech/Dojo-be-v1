import { Schema, model, Document, Types } from 'mongoose';
import { IQuiz } from './quizSchema';
import { IChapter } from './chapterSchema';
import { ResultsByQuestion } from './resultByQuestionSchema';

interface IResultsByChapter extends Document {
  quiz_ref: Types.ObjectId | IQuiz;
  chapter_ref: Types.ObjectId | IChapter;
  user_ref: Types.ObjectId | IChapter;
  questions_done: string;
  results_by_question_ref: Types.ObjectId[];
}

const resultsByChapterSchema = new Schema<IResultsByChapter>({
  quiz_ref: { type: Schema.Types.ObjectId, ref: "Quiz" },
  chapter_ref: { type: Schema.Types.ObjectId, ref: "Chapter" },
  user_ref: { type: Schema.Types.ObjectId, ref: "Chapter" },
  questions_done: { type: String },
  results_by_question_ref: [
    { type: Schema.Types.ObjectId, ref: ResultsByQuestion },
  ],
});

const ResultsByChapter = model<IResultsByChapter>('ResultsByChapter', resultsByChapterSchema);

export { ResultsByChapter, IResultsByChapter };
