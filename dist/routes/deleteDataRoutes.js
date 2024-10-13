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
const questionSchema_1 = __importDefault(require("../schemas/questionSchema"));
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const mongoose_1 = require("mongoose");
const quizSchema_1 = require("../schemas/quizSchema");
const resultsByChapterSchema_1 = require("../schemas/resultsByChapterSchema");
const resultByQuestionSchema_1 = require("../schemas/resultByQuestionSchema");
const router = express_1.default.Router();
const toObjectId = (id) => {
    try {
        return new mongoose_1.Types.ObjectId(id);
    }
    catch (error) {
        throw new Error('Invalid ObjectId');
    }
};
// Delete a user
router.delete('/users/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = toObjectId(req.params.id);
        const user = yield userSchema_1.default.findById(userId).populate('quizzes_ref').populate('classes_ref');
        if (!user) {
            return res.status(404).send('User not found');
        }
        const quizzes = user.quizzes_ref || [];
        const quizIds = quizzes.map((quiz) => quiz._id);
        const resultsByChapters = yield resultsByChapterSchema_1.ResultsByChapter.find({ quiz_ref: { $in: quizIds } });
        const resultsByChapterIds = resultsByChapters.map(result => result._id);
        yield resultByQuestionSchema_1.ResultsByQuestion.deleteMany({ results_by_chapter_ref: { $in: resultsByChapterIds } });
        yield resultsByChapterSchema_1.ResultsByChapter.deleteMany({ quiz_ref: { $in: quizIds } });
        yield quizSchema_1.Quiz.deleteMany({ _id: { $in: quizIds } });
        const classIds = ((_a = user.classes_ref) === null || _a === void 0 ? void 0 : _a.map((cls) => cls._id)) || [];
        yield classSchema_1.Class.updateMany({ _id: { $in: classIds } }, { $pull: { users_ref: userId } });
        yield userSchema_1.default.findByIdAndDelete(userId);
        res.status(200).send('User deleted successfully');
    }
    catch (error) {
        console.error('Error deleting user and associated data:', error);
        res.status(500).send('Error deleting user and associated data');
    }
}));
// Delete a university
router.delete('/universities/:universityId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const universityId = req.params.universityId;
        const universityDoc = yield universitySchema_1.default.findById(universityId);
        if (!universityDoc) {
            return res.status(404).send('University not found.');
        }
        const courseIds = universityDoc.courses_ref;
        yield Promise.all(courseIds.map((courseId) => __awaiter(void 0, void 0, void 0, function* () {
            const courseDoc = yield courseSchema_1.Course.findById(courseId);
            if (courseDoc) {
                const classIds = courseDoc.classes_ref;
                yield Promise.all(classIds.map((classId) => __awaiter(void 0, void 0, void 0, function* () {
                    const classDoc = yield classSchema_1.Class.findById(classId);
                    if (classDoc) {
                        const subjectIds = classDoc.subjects_ref;
                        console.log('Subject IDs:', subjectIds);
                        yield Promise.all(subjectIds.map((subjectId) => __awaiter(void 0, void 0, void 0, function* () {
                            const subjectDoc = yield subjectSchema_1.Subject.findById(subjectId);
                            if (subjectDoc) {
                                const chapterIds = subjectDoc.chapters_ref;
                                yield questionSchema_1.default.deleteMany({ chapter_ref: { $in: chapterIds } });
                                yield Promise.all(chapterIds.map((chapterId) => __awaiter(void 0, void 0, void 0, function* () {
                                    yield chapterSchema_1.Chapter.findByIdAndDelete(chapterId);
                                })));
                                yield subjectSchema_1.Subject.findByIdAndDelete(subjectId);
                            }
                        })));
                        yield classSchema_1.Class.findByIdAndDelete(classId);
                    }
                })));
                yield courseSchema_1.Course.findByIdAndDelete(courseId);
            }
        })));
        yield universitySchema_1.default.findByIdAndDelete(universityId);
        yield courseSchema_1.Course.updateMany({ _id: { $in: courseIds } }, { $pull: { universities_ref: universityId } });
        res.status(200).send('University and all associated courses, classes, subjects, chapters, and questions deleted successfully.');
    }
    catch (error) {
        console.error('Error deleting university:', error);
        res.status(500).send('Error deleting university.');
    }
}));
// Delete a course
router.delete('/courses/:courseId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courseId = req.params.courseId;
        const courseDoc = yield courseSchema_1.Course.findById(courseId);
        if (!courseDoc) {
            return res.status(404).send('Course not found.');
        }
        const classIds = courseDoc.classes_ref;
        for (const classId of classIds) {
            const classDoc = yield classSchema_1.Class.findById(classId);
            if (classDoc) {
                const subjectIds = classDoc.subjects_ref;
                for (const subjectId of subjectIds) {
                    const subjectDoc = yield subjectSchema_1.Subject.findById(subjectId);
                    if (subjectDoc) {
                        const chapterIds = subjectDoc.chapters_ref;
                        for (const chapterId of chapterIds) {
                            yield questionSchema_1.default.deleteMany({ chapter_ref: chapterId });
                            yield chapterSchema_1.Chapter.findByIdAndDelete(chapterId);
                        }
                        yield subjectSchema_1.Subject.findByIdAndDelete(subjectId);
                    }
                }
                yield classSchema_1.Class.findByIdAndDelete(classId);
            }
        }
        const deletedCourse = yield courseSchema_1.Course.findByIdAndDelete(courseId);
        if (!deletedCourse) {
            return res.status(404).send('Course not found.');
        }
        const university = yield universitySchema_1.default.findOneAndUpdate({ courses_ref: courseId }, { $pull: { courses_ref: courseId } });
        if (!university) {
            return res.status(404).send('University not found.');
        }
        res.status(200).send('Course deleted successfully.');
    }
    catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).send('Error deleting course.');
    }
}));
// Delete a class
router.delete('/classes/:classId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const classId = req.params.classId;
        let classObjectId;
        try {
            classObjectId = toObjectId(classId);
        }
        catch (error) {
            return res.status(400).json({ message: 'Invalid Class ID.' });
        }
        const classDoc = yield classSchema_1.Class.findById(classObjectId).populate('subjects_ref');
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found.' });
        }
        const subjectIds = classDoc.subjects_ref.map(subject => subject._id);
        const subjectChapters = yield subjectSchema_1.Subject.find({ _id: { $in: subjectIds } }).select('chapters_ref').lean();
        const chapterIds = subjectChapters.flatMap(subject => subject.chapters_ref);
        yield questionSchema_1.default.deleteMany({ chapter_ref: { $in: chapterIds } });
        yield chapterSchema_1.Chapter.deleteMany({ _id: { $in: chapterIds } });
        yield subjectSchema_1.Subject.deleteMany({ _id: { $in: subjectIds } });
        yield classSchema_1.Class.findByIdAndDelete(classObjectId);
        yield courseSchema_1.Course.findOneAndUpdate({ classes_ref: classId }, { $pull: { classes_ref: classId } }, { new: true });
        res.status(200).json({ message: 'Class deleted successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting class.' });
    }
}));
// Delete a subject
router.delete('/subjects/:subjectId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subjectId = req.params.subjectId;
        const subject = yield subjectSchema_1.Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found.' });
        }
        const chapterIds = subject.chapters_ref;
        for (const chapterId of chapterIds) {
            yield questionSchema_1.default.deleteMany({ chapter_ref: chapterId });
        }
        yield chapterSchema_1.Chapter.deleteMany({ _id: { $in: chapterIds } });
        yield subjectSchema_1.Subject.findByIdAndDelete(subjectId);
        const classDoc = yield classSchema_1.Class.findOneAndUpdate({ subjects_ref: subjectId }, { $pull: { subjects_ref: subjectId } });
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found.' });
        }
        res.status(200).json({ message: 'Subject deleted successfully.' });
    }
    catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ message: 'Error deleting subject.' });
    }
}));
// Delete a chapter
router.delete('/chapters/:chapterId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chapterId = req.params.chapterId;
        yield questionSchema_1.default.deleteMany({ chapter_ref: chapterId });
        const deletedChapter = yield chapterSchema_1.Chapter.findByIdAndDelete(chapterId);
        if (!deletedChapter) {
            return res.status(404).json({ message: 'Chapter not found.' });
        }
        const subject = yield subjectSchema_1.Subject.findOneAndUpdate({ chapters_ref: chapterId }, { $pull: { chapters_ref: chapterId } });
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found.' });
        }
        res.status(200).json({ message: 'Chapter deleted successfully.' });
    }
    catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({ message: 'Error deleting chapter.' });
    }
}));
// Delete a question
router.delete('/questions/:questionId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const questionId = req.params.questionId;
        const deletedQuestion = yield questionSchema_1.default.findByIdAndDelete(questionId);
        if (!deletedQuestion) {
            return res.status(404).json({ message: 'Question not found.' });
        }
        const chapter = yield chapterSchema_1.Chapter.findOneAndUpdate({ questions_ref: questionId }, { $pull: { questions_ref: questionId } }, { new: true });
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found.' });
        }
        chapter.number_of_questions = chapter.questions_ref.length;
        yield chapter.save();
        res.status(200).json({ message: 'Question deleted successfully.' });
    }
    catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ message: 'Error deleting question.' });
    }
}));
exports.default = router;
