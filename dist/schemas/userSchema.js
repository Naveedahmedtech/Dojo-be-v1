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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHashed: { type: String, required: true },
    role: { type: String, required: true },
    university_ref: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "University",
        required: true,
    },
    classes_ref: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Class" }],
    quizzes_ref: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Quiz" }],
    total_question_done: { type: Number },
});
userSchema.index({ email: 1 }, { unique: true });
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified("passwordHashed")) {
            this.passwordHashed = yield bcryptjs_1.default.hash(this.passwordHashed, 10);
        }
        next();
    });
});
const User = (0, mongoose_1.model)("User", userSchema);
exports.default = User;
