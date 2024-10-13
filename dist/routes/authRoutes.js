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
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const universitySchema_1 = __importDefault(require("../schemas/universitySchema"));
const courseSchema_1 = require("../schemas/courseSchema");
const classSchema_1 = require("../schemas/classSchema");
const subjectSchema_1 = require("../schemas/subjectSchema");
const chapterSchema_1 = require("../schemas/chapterSchema");
const questionSchema_1 = __importDefault(require("../schemas/questionSchema"));
const router = express_1.default.Router();
const FE_API = process.env.FE_API;
const generateSecretKey = () => crypto_1.default.randomBytes(32).toString('hex');
const JWT_SECRET = process.env.JWT_SECRET || generateSecretKey();
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }
        const user = yield userSchema_1.default.findOne({ email })
            .populate({
            path: "university_ref",
            select: "university_name",
        })
            .populate({
            path: "classes_ref",
            select: "class_name year_of_beginning subjects_ref course_ref",
            populate: [
                {
                    path: "course_ref",
                    select: "course_name",
                },
                {
                    path: "subjects_ref",
                    select: "subject_name chapters_ref subject_icon_url _id",
                    populate: {
                        path: "chapters_ref",
                        select: "chapter_name _id",
                        match: { is_available: true },
                        populate: {
                            path: "questions_ref",
                            select: "question_text options",
                        },
                    },
                },
            ],
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const passwordMatch = yield bcryptjs_1.default.compare(password, user.passwordHashed);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        let university_name = "Unknown";
        if (user === null || user === void 0 ? void 0 : user.university_ref) {
            university_name = user.university_ref.university_name;
        }
        const class_info = [];
        if (user === null || user === void 0 ? void 0 : user.classes_ref) {
            user.classes_ref.forEach((classRef) => {
                var _a, _b, _c, _d;
                const course_name = (_b = (_a = classRef.course_ref) === null || _a === void 0 ? void 0 : _a.course_name) !== null && _b !== void 0 ? _b : "Unknown";
                const subjects_info = (_d = (_c = classRef.subjects_ref) === null || _c === void 0 ? void 0 : _c.map((subjectRef) => {
                    var _a;
                    return ({
                        subject_id: subjectRef._id,
                        subject_name: subjectRef.subject_name,
                        subject_icon_url: subjectRef.subject_icon_url,
                        chapters: (_a = subjectRef.chapters_ref) === null || _a === void 0 ? void 0 : _a.map((chapterRef) => {
                            var _a;
                            return ({
                                _id: chapterRef._id,
                                chapter_name: chapterRef.chapter_name,
                                questions: (_a = chapterRef.questions_ref) === null || _a === void 0 ? void 0 : _a.map((questionRef) => ({
                                    question_text: questionRef.question_text,
                                    options: questionRef.options,
                                })),
                            });
                        }),
                    });
                })) !== null && _d !== void 0 ? _d : [];
                class_info.push({
                    class_name: classRef.class_name,
                    year_of_beginning: classRef.year_of_beginning,
                    course_name,
                    subjects: subjects_info,
                });
            });
        }
        let universities = [];
        let courses = [];
        let classes = [];
        let subjects = [];
        let chapters = [];
        let questions = [];
        if ((user === null || user === void 0 ? void 0 : user.role) === "admin") {
            universities = yield universitySchema_1.default.find();
            courses = yield courseSchema_1.Course.find();
            classes = yield classSchema_1.Class.find({ university_ref: user.university_ref })
                .populate("course_ref")
                .populate({
                path: "subjects_ref",
                populate: {
                    path: "chapters_ref",
                    match: { is_available: true },
                    select: "chapter_name _id",
                    populate: {
                        path: "questions_ref",
                        select: "question_text options",
                    },
                },
            })
                .populate("users_ref");
            subjects = yield subjectSchema_1.Subject.find();
            chapters = yield chapterSchema_1.Chapter.find({ is_available: true });
            questions = yield questionSchema_1.default.find();
        }
        else if ((user === null || user === void 0 ? void 0 : user.role) === "teacher") {
            universities = yield universitySchema_1.default.find();
            courses = yield courseSchema_1.Course.find({ university_ref: user.university_ref });
            classes = yield classSchema_1.Class.find({ university_ref: user.university_ref })
                .populate("course_ref")
                .populate({
                path: "subjects_ref",
                populate: {
                    path: "chapters_ref",
                    match: { is_available: true },
                    select: "chapter_name _id",
                    populate: {
                        path: "questions_ref",
                        select: "question_text options",
                    },
                },
            })
                .populate("users_ref");
            subjects = yield subjectSchema_1.Subject.find({ university_ref: user.university_ref });
            chapters = yield chapterSchema_1.Chapter.find({
                university_ref: user.university_ref,
                is_available: true,
            });
            questions = yield questionSchema_1.default.find({ university_ref: user.university_ref });
        }
        const userInfo = {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
            university_name,
            class_info,
            quizzes_ref: user.quizzes_ref,
            universities,
            courses,
            classes,
            subjects,
            chapters,
            questions,
        };
        console.log("userInfo", userInfo);
        const token = jsonwebtoken_1.default.sign({ _id: user._id, role: user.role }, JWT_SECRET, {
            expiresIn: "7d",
        });
        res.status(200).json({ token, userInfo });
    }
    catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Login process was unsuccessful" });
    }
}));
// nodemailer transporter
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.mailtrap.io',
    port: 587,
    auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD,
    },
});
// Send reset password email
router.post('/forgot-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield userSchema_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: `Email '${email}' is not registered` });
        }
        const secret = process.env.JWT_SECRET + user.passwordHashed;
        const payload = {
            email: user.email,
            id: user.id
        };
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '1h' });
        const resetLink = `${FE_API}/auth/reset-password/${user.id}/${token}`;
        console.log(resetLink);
        const senderAddress = `"Thot Reset Password Link" <mailtrap@dojoapp.tech>`;
        const recipientAddress = email;
        const mailOptions = {
            from: senderAddress,
            to: recipientAddress,
            subject: 'Thot Password Reset Request',
            html: `
            <p>Hello ${user.first_name},</p>
            <p>Please click on the following link to reset your password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>If you did not request this, please ignore this email</p>
        `
        };
        yield transporter.sendMail(mailOptions);
        console.log(resetLink);
        res.send('Password reset link has been sent to your email');
    }
    catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// Render reset password page
router.get('/reset-password/:id/:token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, token } = req.params;
    try {
        const user = yield userSchema_1.default.findById(id);
        if (!user) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        const secret = JWT_SECRET + user.passwordHashed;
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (decoded.email !== user.email) {
            return res.status(400).json({ message: 'Invalid token or expired link' });
        }
        res.render('reset-password', { email: user.email });
    }
    catch (error) {
        console.error('Error in reset password:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// Handle reset password form submission
router.post('/reset-password/:id/:token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, token } = req.params;
    const { password } = req.body;
    try {
        const user = yield userSchema_1.default.findById(id);
        if (!user) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        const secret = JWT_SECRET + user.passwordHashed;
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (!decoded || typeof decoded !== 'object' || !decoded.email) {
            return res.status(400).json({ message: 'Invalid token or expired link' });
        }
        if (decoded.email !== user.email) {
            return res.status(400).json({ message: 'Invalid token or expired link' });
        }
        if (password) {
            const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
            user.passwordHashed = hashedPassword;
            yield user.save();
        }
        res.json({ message: 'Password reset successful' });
    }
    catch (error) {
        console.error('Error in reset password:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = router;
