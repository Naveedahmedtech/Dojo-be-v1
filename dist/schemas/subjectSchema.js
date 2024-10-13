"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subject = void 0;
const mongoose_1 = require("mongoose");
const subjectSchema = new mongoose_1.Schema({
    university_ref: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "University",
        required: true,
    },
    class_ref: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Class",
        required: true,
    },
    subject_name: {
        type: String,
        required: true,
    },
    subject_icon_url: {
        type: String,
        required: true,
    },
    total_question_done: {
        type: Number,
        default: 0,
    },
    chapters_ref: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Chapter",
        },
    ],
});
const Subject = (0, mongoose_1.model)("Subject", subjectSchema);
exports.Subject = Subject;
