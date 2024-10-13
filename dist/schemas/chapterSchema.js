"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chapter = void 0;
const mongoose_1 = require("mongoose");
const chapterSchema = new mongoose_1.Schema({
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
    subject_ref: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
    },
    chapter_name: {
        type: String,
        required: true,
    },
    is_available: {
        type: Boolean,
        required: true,
    },
    number_of_questions: {
        type: Number,
        default: 0,
    },
    total_question_done: {
        type: Number,
        default: 0,
    },
    questions_ref: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Question",
        },
    ],
});
chapterSchema.pre('save', function (next) {
    this.number_of_questions = this.questions_ref.length;
    next();
});
chapterSchema.post('findOneAndUpdate', function (doc) {
    return __awaiter(this, void 0, void 0, function* () {
        if (doc) {
            yield doc.updateOne({ number_of_questions: doc.questions_ref.length });
        }
    });
});
const Chapter = (0, mongoose_1.model)('Chapter', chapterSchema);
exports.Chapter = Chapter;
