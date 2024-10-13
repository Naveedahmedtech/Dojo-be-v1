"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
const userSubjectProgressSchema = new mongoose_1.Schema({
    user_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    subject_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
    },
    total_questions_done: { type: Number, default: 0 },
});
const UserSubjectProgress = (0, mongoose_1.model)("UserSubjectProgress", userSubjectProgressSchema);
exports.default = UserSubjectProgress;
