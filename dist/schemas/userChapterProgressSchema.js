"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
const UserChapterProgressSchema = new mongoose_1.Schema({
    user_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    chapter_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
    },
    total_questions_done: { type: Number, default: 0 },
    mode: { type: String, required: true },
});
const UserChapterProgress = (0, mongoose_1.model)("UserChapterProgress", UserChapterProgressSchema);
exports.default = UserChapterProgress;
