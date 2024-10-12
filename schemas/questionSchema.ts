import mongoose, { Schema, Document, Types } from 'mongoose';
import { IChapter } from './chapterSchema';


export interface IQuestionOption {
    latex_content: string;
    image_url?: string;
    is_correct: boolean;
}


export interface IQuestion extends Document {
    chapter_ref: Types.ObjectId | IChapter;
    q_number?: number;
    book_author?: string;
    book_name?: string;
    q_latex_content?: string;
    q_image_url?: string;
    q_latex_explanation?: string;
    q_latex_explanation_ChatGPT?: string;
    q_answertype_tofill?: boolean;
    q_answertype_options?: IQuestionOption[];
    q_answertype_options_has_multiple_good_answers?: boolean;
}


const questionOptionSchema = new Schema<IQuestionOption>({
    latex_content: { type: String },
    image_url: { type: String },
    is_correct: { type: Boolean },
});

const questionSchema: Schema<IQuestion> = new Schema<IQuestion>({
    chapter_ref: { type: Schema.Types.ObjectId, ref: 'Chapter' },
    q_number: { type: Number },
    book_author: { type: String },
    book_name: { type: String },
    q_latex_content: { type: String },
    q_image_url: { type: String },
    q_latex_explanation: { type: String },
    q_latex_explanation_ChatGPT: { type: String },
    q_answertype_tofill: { type: Boolean },
    q_answertype_options: { type: [questionOptionSchema] },
    q_answertype_options_has_multiple_good_answers: { type: Boolean },  
});

const Question = mongoose.model<IQuestion>('Question', questionSchema);

export default Question;