"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Quiz = void 0;
const mongoose_1 = require("mongoose");
const quizSchema = new mongoose_1.Schema({
    chapters_ref: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Chapter" }],
    user_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    quiz_mode: { type: String },
    date: { type: Date, default: Date.now },
    total_time_spent: { type: String, default: "00:00:00" },
    results_by_chapter_ref: [
        { type: mongoose_1.Schema.Types.ObjectId, ref: "ResultsByChapter" },
    ],
    is_exam_mode: { type: Boolean },
});
const Quiz = (0, mongoose_1.model)("Quiz", quizSchema);
exports.Quiz = Quiz;
