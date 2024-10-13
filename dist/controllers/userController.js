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
exports.getUserByIdController = exports.updateUserController = exports.createUserController = void 0;
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const classSchema_1 = require("../schemas/classSchema");
const universitySchema_1 = __importDefault(require("../schemas/universitySchema"));
const courseSchema_1 = require("../schemas/courseSchema");
const subjectSchema_1 = require("../schemas/subjectSchema");
const chapterSchema_1 = require("../schemas/chapterSchema");
const questionSchema_1 = __importDefault(require("../schemas/questionSchema"));
const generateSecretKey = () => {
    return crypto_1.default.randomBytes(32).toString("hex");
};
const JWT_SECRET = process.env.JWT_SECRET || generateSecretKey();
const createUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const usersData = req.body;
        if (!Array.isArray(usersData) || usersData.length === 0) {
            return res.status(400).json({ message: "Invalid user data provided" });
        }
        const createdUsers = [];
        const tokens = [];
        for (const userData of usersData) {
            const { first_name, last_name, email, password, role, university_ref, classes_ref, } = userData;
            if (!first_name ||
                !last_name ||
                !email ||
                !password ||
                !role ||
                !university_ref ||
                !Array.isArray(classes_ref)) {
                return res.status(400).json({ message: "Missing required fields" });
            }
            const existingUser = yield userSchema_1.default.findOne({ email });
            if (existingUser) {
                return res
                    .status(400)
                    .json({ message: `Email '${email}' is already registered` });
            }
            let universities, courses, classes, subjects, chapters, questions;
            if (role === "admin") {
                universities = yield universitySchema_1.default.find();
                courses = yield courseSchema_1.Course.find();
                classes = yield classSchema_1.Class.find({ university_ref })
                    .populate("course_ref")
                    .populate("subjects_ref")
                    .populate("users_ref");
                subjects = yield subjectSchema_1.Subject.find();
                chapters = yield chapterSchema_1.Chapter.find();
                questions = yield questionSchema_1.default.find();
            }
            else if (role === "teacher") {
                universities = yield universitySchema_1.default.findById(university_ref);
                courses = yield courseSchema_1.Course.find({ university_ref });
                classes = yield classSchema_1.Class.find({ university_ref })
                    .populate("course_ref")
                    .populate("subjects_ref")
                    .populate("users_ref");
                subjects = yield subjectSchema_1.Subject.find({ university_ref });
                chapters = yield chapterSchema_1.Chapter.find({ university_ref });
                questions = yield questionSchema_1.default.find({ university_ref });
            }
            const newUser = new userSchema_1.default({
                first_name,
                last_name,
                email,
                passwordHashed: password,
                role,
                university_ref,
                classes_ref,
                quizzes_ref: [],
            });
            yield newUser.save();
            createdUsers.push(newUser);
            const token = jsonwebtoken_1.default.sign({ _id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: "30d" });
            tokens.push(token);
            yield classSchema_1.Class.updateMany({ _id: { $in: classes_ref } }, { $push: { users_ref: newUser._id } });
        }
        return res.status(201).json({ users: createdUsers, tokens });
    }
    catch (error) {
        console.error("Error adding users:", error);
        return res
            .status(500)
            .json({ message: "Error adding users. Please try again." });
    }
});
exports.createUserController = createUserController;
const updateUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid user ID");
        }
        const { first_name, last_name, newPassword, email, total_question_done } = req.body;
        const updateData = {};
        if (first_name)
            updateData.first_name = first_name;
        if (last_name)
            updateData.last_name = last_name;
        // if (total_question_done) updateData.total_question_done = total_question_done;
        if (newPassword) {
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
            updateData.passwordHashed = hashedPassword;
        }
        if (email)
            updateData.email = email;
        console.log("total_question_done_before", total_question_done, updateData.total_question_done);
        // Handle the increment for total_question_done
        if (total_question_done) {
            const user = yield userSchema_1.default.findById(id);
            if (user && user.total_question_done) {
                console.log("Update it Exiting");
                updateData.total_question_done = user.total_question_done + 1;
            }
            else {
                console.log("Update it with ONE");
                updateData.total_question_done = 1;
            }
        }
        const updatedUser = yield userSchema_1.default.findByIdAndUpdate(id, updateData, {
            new: true,
        });
        if (updatedUser) {
            res.status(200).json(updatedUser);
        }
        else {
            res.status(404).send("User not found");
        }
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Error updating user");
    }
});
exports.updateUserController = updateUserController;
// Get user's full name by ID
const getUserByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = yield userSchema_1.default.findById(userId).select("first_name last_name role total_question_done");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            firstName: user.first_name,
            lastName: user.last_name,
            total_question_done: user.total_question_done || 0,
        });
    }
    catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getUserByIdController = getUserByIdController;
