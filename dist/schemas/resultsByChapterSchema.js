"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsByChapter = void 0;
const mongoose_1 = require("mongoose");
const resultByQuestionSchema_1 = require("./resultByQuestionSchema");
const resultsByChapterSchema = new mongoose_1.Schema({
    quiz_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: "Quiz" },
    chapter_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: "Chapter" },
    user_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: "Chapter" },
    questions_done: { type: String },
    results_by_question_ref: [
        { type: mongoose_1.Schema.Types.ObjectId, ref: resultByQuestionSchema_1.ResultsByQuestion },
    ],
});
const ResultsByChapter = (0, mongoose_1.model)('ResultsByChapter', resultsByChapterSchema);
exports.ResultsByChapter = ResultsByChapter;
