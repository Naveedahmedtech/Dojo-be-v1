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
const universitySchema_1 = __importDefault(require("../schemas/universitySchema"));
const courseSchema_1 = require("../schemas/courseSchema");
const classSchema_1 = require("../schemas/classSchema");
const subjectSchema_1 = require("../schemas/subjectSchema");
const chapterSchema_1 = require("../schemas/chapterSchema");
const mongoose_1 = require("mongoose");
const userController_1 = require("../controllers/userController");
const questionSchema_1 = __importDefault(require("../schemas/questionSchema"));
const decodeBase64_1 = require("../utils/decodeBase64");
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const mongoose = require('mongoose');
const router = express_1.default.Router();
const toObjectId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId');
    }
    return new mongoose_1.Types.ObjectId(id);
};
// Add a new university
router.post('/universities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { university_name } = req.body;
        if (!university_name) {
            return res.status(400).send('University name is required.');
        }
        const existingUniversity = yield universitySchema_1.default.findOne({ university_name });
        if (existingUniversity) {
            return res.status(400).send('University already exists.');
        }
        const university = new universitySchema_1.default({ university_name });
        yield university.save();
        yield university.populate('courses_ref');
        res.status(201).json({
            message: 'University created successfully.',
            university: university
        });
    }
    catch (error) {
        console.error('Error creating university:', error);
        res.status(500).send('Error creating university.');
    }
}));
// Add a new course
router.post('/courses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { university_ref, course_name, classes_ref } = req.body;
        if (!university_ref || !course_name) {
            return res.status(400).json({ message: 'University ID and course name are required.' });
        }
        let universityRef;
        try {
            universityRef = toObjectId(university_ref);
        }
        catch (error) {
            return res.status(400).json({ message: 'Invalid University ID.' });
        }
        const university = yield universitySchema_1.default.findById(universityRef);
        if (!university) {
            return res.status(404).json({ message: 'University not found.' });
        }
        const course = new courseSchema_1.Course({
            university_ref: universityRef,
            course_name,
            classes_ref: classes_ref || []
        });
        yield course.save();
        university.courses_ref.push(course._id);
        yield university.save();
        const adminUniversity = yield universitySchema_1.default.findOne({ university_name: 'admin' });
        if (adminUniversity) {
            adminUniversity.courses_ref.push(course._id);
            yield adminUniversity.save();
        }
        else {
            console.warn('Admin university not found.');
        }
        res.status(201).json({
            message: 'Course created successfully.',
            course
        });
    }
    catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Error creating course.' });
    }
}));
// Add a new class
router.post('/classes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { university_ref, course_ref, year_of_beginning, class_name, subjects_ref, users_ref } = req.body;
        if (!university_ref || !course_ref || !year_of_beginning || !class_name) {
            return res.status(400).send('University ID, Course ID, year of beginning, and class name are required.');
        }
        const universityRef = toObjectId(university_ref);
        const courseRef = toObjectId(course_ref);
        const university = yield universitySchema_1.default.findById(universityRef);
        if (!university) {
            return res.status(404).send('University not found.');
        }
        const course = yield courseSchema_1.Course.findById(courseRef);
        if (!course) {
            return res.status(404).send('Course not found.');
        }
        const newClass = new classSchema_1.Class({
            university_ref: universityRef,
            course_ref: courseRef,
            year_of_beginning,
            class_name,
            subjects_ref: subjects_ref || [],
            users_ref: users_ref || []
        });
        yield newClass.save();
        course.classes_ref.push(newClass._id);
        yield course.save();
        yield userSchema_1.default.updateMany({ role: 'admin' }, { $push: { classes_ref: newClass._id } });
        res.status(201).send('Class created successfully and added to admin users.');
    }
    catch (error) {
        console.error('Error creating class:', error);
        res.status(500).send('Error creating class.');
    }
}));
// Add a new subject
router.post('/subjects', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { university_ref, class_ref, subject_name, subject_icon_url } = req.body;
        if (!university_ref || !class_ref || !subject_name || !subject_icon_url) {
            return res.status(400).json({ message: 'University ID, class ID, subject name, and subject icon URL are required.' });
        }
        const universityRef = new mongoose.Types.ObjectId(university_ref);
        const university = yield universitySchema_1.default.findById(universityRef);
        if (!university) {
            return res.status(404).json({ message: 'University not found.' });
        }
        const classRef = new mongoose.Types.ObjectId(class_ref);
        const classObj = yield classSchema_1.Class.findById(classRef);
        if (!classObj) {
            return res.status(404).json({ message: 'Class not found.' });
        }
        const subject = new subjectSchema_1.Subject({
            university_ref: universityRef,
            class_ref: classRef,
            subject_name,
            subject_icon_url,
            chapters_ref: []
        });
        const savedSubject = yield subject.save();
        classObj.subjects_ref.push(savedSubject);
        yield classObj.save();
        return res.status(201).json({ message: 'Subject created successfully.', subject: savedSubject });
    }
    catch (error) {
        console.error('Error creating subject:', error);
        return res.status(500).json({ message: 'Error creating subject.' });
    }
}));
// Add a new chapter
router.post('/chapters', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subject_ref, chapter_name, is_available = true } = req.body;
        if (!subject_ref || !chapter_name) {
            return res.status(400).json({ message: 'Subject ID and chapter name are required.' });
        }
        const subject = yield subjectSchema_1.Subject.findById(subject_ref);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found.' });
        }
        const universityRef = new mongoose.Types.ObjectId(subject.university_ref);
        const university = yield universitySchema_1.default.findById(universityRef);
        if (!university) {
            return res.status(404).json({ message: 'University not found.' });
        }
        const classRef = new mongoose.Types.ObjectId(subject.class_ref);
        const classObj = yield classSchema_1.Class.findById(classRef);
        if (!classObj) {
            return res.status(404).json({ message: 'Class not found.' });
        }
        const chapter = new chapterSchema_1.Chapter({
            university_ref: universityRef,
            class_ref: classRef,
            subject_ref: subject_ref,
            chapter_name: chapter_name,
            is_available: is_available,
            number_of_questions: 0,
            questions_ref: []
        });
        const savedChapter = yield chapter.save();
        subject.chapters_ref.push(savedChapter);
        yield subject.save();
        return res.status(201).json({ message: 'Chapter created successfully.', chapter: savedChapter });
    }
    catch (error) {
        console.error('Error creating chapter:', error);
        return res.status(500).json({ message: 'Error creating chapter.' });
    }
}));
// Add new question
router.post('/questions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chapter_ref, parsedData } = req.body;
        if (!mongoose.Types.ObjectId.isValid(chapter_ref)) {
            return res.status(400).json({ message: 'Invalid chapter reference' });
        }
        parsedData.sort((a, b) => a.q_number - b.q_number);
        const formattedQuestions = yield Promise.all(parsedData.map((questionData) => __awaiter(void 0, void 0, void 0, function* () {
            const options = [];
            if (questionData.q_answertype_options) {
                for (let i = 0; i < questionData.q_answertype_options.length; i++) {
                    const option = questionData.q_answertype_options[i];
                    let imageUrl = '';
                    try {
                        if (option.image_url) {
                            imageUrl = yield (0, decodeBase64_1.decodeBase64)(option.image_url, `option-${questionData.q_number}-${i}.png`);
                        }
                    }
                    catch (error) {
                        console.error(`Error fetching image for option ${i}:`, error);
                    }
                    options.push({
                        latex_content: option.latex_content,
                        image_url: imageUrl,
                        is_correct: option.is_correct,
                    });
                }
            }
            let imageUrl = '';
            try {
                if (questionData.q_image_url) {
                    imageUrl = yield (0, decodeBase64_1.decodeBase64)(questionData.q_image_url, `question-${questionData.q_number}.png`);
                }
            }
            catch (error) {
                console.error(`Error fetching main image for question ${questionData.q_number}:`, error);
            }
            return {
                chapter_ref,
                q_number: questionData.q_number,
                book_author: questionData.book_author,
                book_name: questionData.book_name,
                q_latex_content: questionData.q_latex_content,
                q_image_url: imageUrl,
                q_latex_explanation: questionData.q_latex_explanation,
                q_latex_explanation_ChatGPT: questionData.q_latex_explanation_ChatGPT,
                q_answertype_tofill: questionData.q_answertype_tofill,
                q_answertype_options_has_multiple_good_answers: questionData.q_answertype_options_has_multiple_good_answers,
                q_answertype_options: options,
            };
        })));
        const insertedQuestions = yield questionSchema_1.default.insertMany(formattedQuestions);
        const chapter = yield chapterSchema_1.Chapter.findByIdAndUpdate(chapter_ref, { $push: { questions_ref: { $each: insertedQuestions.map(q => q._id) } } }, { new: true });
        if (chapter) {
            chapter.number_of_questions = chapter.questions_ref.length;
            yield chapter.save();
        }
        res.status(200).json({ message: 'Questions saved successfully' });
    }
    catch (error) {
        console.error('Error saving questions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}));
// Add a new user
router.post('/users', userController_1.createUserController);
exports.default = router;
