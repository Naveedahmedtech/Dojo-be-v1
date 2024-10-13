"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
const TotalQuestionDoneSchema = new mongoose_1.Schema({
    user_ref: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    total_questions_done: { type: Number, default: 0 },
    mode: { type: String, required: true },
    date: { type: Date, required: true },
}, {
    timestamps: true,
});
const TotalQuestionDone = (0, mongoose_1.model)("TotalQuestionDone", TotalQuestionDoneSchema);
exports.default = TotalQuestionDone;
