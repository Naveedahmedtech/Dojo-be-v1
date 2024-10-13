"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsByQuestion = void 0;
const mongoose_1 = require("mongoose");
const resultsByQuestionSchema = new mongoose_1.Schema({
    results_by_chapter_ref: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ResultsByChapter",
    },
    question_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: "Question" },
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
resultsByQuestionSchema.pre('save', function (next) {
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
const ResultsByQuestion = (0, mongoose_1.model)('ResultsByQuestion', resultsByQuestionSchema);
exports.ResultsByQuestion = ResultsByQuestion;
