"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
const TotalCorrectQuestionSchema = new mongoose_1.Schema({
    user_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    counts: { type: Number, default: 0 },
    mode: { type: String, required: true },
    date: { type: Date, required: true },
    chapter_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
    },
    correct_questions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Question",
        default: [],
    },
}, {
    timestamps: true,
});
const TotalCorrectQuestions = (0, mongoose_1.model)("TotalCorrectQuestions", TotalCorrectQuestionSchema);
exports.default = TotalCorrectQuestions;
