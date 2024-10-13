"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const questionOptionSchema = new mongoose_1.Schema({
    latex_content: { type: String },
    image_url: { type: String },
    is_correct: { type: Boolean },
});
const questionSchema = new mongoose_1.Schema({
    chapter_ref: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Chapter' },
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
const Question = mongoose_1.default.model('Question', questionSchema);
exports.default = Question;
