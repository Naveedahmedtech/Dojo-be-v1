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
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const universitySchema_1 = __importDefault(require("../schemas/universitySchema"));
const courseSchema_1 = require("../schemas/courseSchema");
const classSchema_1 = require("../schemas/classSchema");
const chapterSchema_1 = require("../schemas/chapterSchema");
const subjectSchema_1 = require("../schemas/subjectSchema");
const questionSchema_1 = __importDefault(require("../schemas/questionSchema"));
const router = express_1.default.Router();
// Get all universities
router.get('/universities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const universities = yield universitySchema_1.default.find();
        res.send(universities);
    }
    catch (error) {
        console.error('Error fetching universities:', error);
        res.status(500).send('Error fetching universities');
    }
}));
// Get all courses
router.get('/courses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courses = yield courseSchema_1.Course.find();
        res.send(courses);
    }
    catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).send('Error fetching courses');
    }
}));
// Get all classes
router.get('/classes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const classes = yield classSchema_1.Class.find().populate('course_ref').populate('subjects_ref').populate('users_ref');
        res.send(classes);
    }
    catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).send('Error fetching classes');
    }
}));
// Get all subjects
router.get('/subjects', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subjects = yield subjectSchema_1.Subject.find();
        res.send(subjects);
    }
    catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).send('Error fetching subjects');
    }
}));
// Get all chapters
router.get('/chapters', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chapters = yield chapterSchema_1.Chapter.find();
        res.send(chapters);
    }
    catch (error) {
        console.error('Error fetching chapters:', error);
        res.status(500).send('Error fetching chapters');
    }
}));
// Get all questions
router.get('/questions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const questions = yield questionSchema_1.default.find();
        res.send(questions);
    }
    catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).send('Error fetching questions');
    }
}));
// Get all users
router.get('/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield userSchema_1.default.find();
        res.send(users);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users');
    }
}));
exports.default = router;
