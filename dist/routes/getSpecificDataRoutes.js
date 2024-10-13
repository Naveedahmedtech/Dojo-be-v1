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
const courseSchema_1 = require("../schemas/courseSchema");
const classSchema_1 = require("../schemas/classSchema");
const subjectSchema_1 = require("../schemas/subjectSchema");
const chapterSchema_1 = require("../schemas/chapterSchema");
const classController_1 = require("../controllers/classController");
const classController_2 = require("../controllers/classController");
const classController_3 = require("../controllers/classController");
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const resultsByChapterSchema_1 = require("../schemas/resultsByChapterSchema");
const classController_4 = require("../controllers/classController");
const router = express_1.default.Router();
// Get courses for a specific university
router.get("/universities/:universityId/courses", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const universityId = req.params.universityId;
        const courses = yield courseSchema_1.Course.find({ university_ref: universityId });
        if (!courses || courses.length === 0) {
            return res.status(404).send("Courses not found for this university");
        }
        res.send(courses);
    }
    catch (error) {
        console.error("Error fetching courses for university:", error);
        res.status(500).send("Error fetching courses for university");
    }
}));
// Get classes for a specific course
router.get("/courses/:courseId/classes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courseId = req.params.courseId;
        const classes = yield classSchema_1.Class.find({ course_ref: courseId });
        if (!classes || classes.length === 0) {
            return res.status(404).send("Classes not found for this course");
        }
        res.send(classes);
    }
    catch (error) {
        console.error("Error fetching classes for course:", error);
        res.status(500).send("Error fetching classes for course");
    }
}));
// Get subjects for a specific class
router.get("/classes/:classId/subjects", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const classId = req.params.classId;
        const subjects = yield subjectSchema_1.Subject.find({ class_ref: classId });
        if (!subjects || subjects.length === 0) {
            return res.status(404).send("Subjects not found for this class");
        }
        res.send(subjects);
    }
    catch (error) {
        console.error("Error fetching subjects for class:", error);
        res.status(500).send("Error fetching subjects for class");
    }
}));
// Get chapters for a specific subject
router.get("/subjects/:subjectId/chapters", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subjectId = req.params.subjectId;
        const chapters = yield chapterSchema_1.Chapter.find({ subject_ref: subjectId });
        if (!chapters || chapters.length === 0) {
            return res.status(404).send("Chapters not found for this subject");
        }
        res.send(chapters);
    }
    catch (error) {
        console.error("Error fetching chapters for subject:", error);
        res.status(500).send("Error fetching chapters for subject");
    }
}));
// Get questions for a specific chapter
router.get("/chapters/:chapterIds/questions", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chapterIdsParam = req.params.chapterIds;
        if (!chapterIdsParam) {
            return res.status(400).send("Missing chapters parameter");
        }
        const chapterIds = chapterIdsParam.split(",");
        const chapters = yield chapterSchema_1.Chapter.find({ _id: { $in: chapterIds } })
            .populate({
            path: "subject_ref",
            model: "Subject",
            select: "subject_name _id",
        })
            .populate("questions_ref");
        if (!chapters || chapters.length === 0) {
            return res.status(404).send("Chapters not found");
        }
        const responseData = chapters.map((chapter) => ({
            _id: chapter._id,
            subject_id: chapter.subject_ref._id,
            subject_name: chapter.subject_ref.subject_name,
            chapter_name: chapter.chapter_name,
            questions: chapter.questions_ref,
        }));
        res.send(responseData);
    }
    catch (error) {
        console.error("Error fetching chapters and questions:", error);
        res.status(500).send("Error fetching chapters and questions");
    }
}));
router.get("/chapters/:chapterIds/questions/exam", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chapterIdsParam = req.params.chapterIds;
        if (!chapterIdsParam) {
            return res.status(400).send("Missing chapters parameter");
        }
        const chapterIds = chapterIdsParam.split(",");
        // Fetch the chapters and questions
        const chapters = yield chapterSchema_1.Chapter.find({ _id: { $in: chapterIds } })
            .populate({
            path: "subject_ref",
            model: "Subject",
            select: "subject_name _id",
        })
            .populate("questions_ref");
        if (!chapters || chapters.length === 0) {
            return res.status(404).send("Chapters not found");
        }
        // Shuffle function for array
        const shuffleArray = (array) => {
            let currentIndex = array.length, randomIndex;
            // While there remain elements to shuffle...
            while (currentIndex !== 0) {
                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                // And swap it with the current element.
                [array[currentIndex], array[randomIndex]] = [
                    array[randomIndex],
                    array[currentIndex],
                ];
            }
            return array;
        };
        // Prepare the response data with shuffled questions
        const responseData = chapters.map((chapter) => ({
            _id: chapter._id,
            subject_id: chapter.subject_ref._id,
            subject_name: chapter.subject_ref.subject_name,
            chapter_name: chapter.chapter_name,
            questions: shuffleArray(chapter.questions_ref), // Shuffle questions here
        }));
        // console.log(
        //   { code: "responseData" },
        //   { responseData, questions: JSON.stringify(responseData?.map((item) => item.questions), null, 2) }
        // );
        res.send(responseData);
    }
    catch (error) {
        console.error("Error fetching chapters and questions:", error);
        res.status(500).send("Error fetching chapters and questions");
    }
}));
// Get years from a class
router.get("/classes/filter-by-years", classController_1.filterClassesByYears);
// Get classes by course ID and year
router.get("/classes/by-course-and-year/:courseId/:year", classController_2.getClassesByCourseAndYear);
// Get years by a course
router.get("/classes/years-by-course/:courseId", classController_3.getYearsByCourse);
// Get classes with subjects, chapters, and grades based on user role
router.get("/:userId/classes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    try {
        const user = yield userSchema_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const userRole = user.role;
        let query = {};
        switch (userRole) {
            case "student":
                query = {
                    users_ref: user._id,
                };
                break;
            case "teacher":
                query = {
                    university_ref: user.university_ref,
                };
                break;
            case "admin":
                break;
            default:
                return res.status(403).json({ message: "Unauthorized access" });
        }
        const classes = yield classSchema_1.Class.find(query)
            .populate({
            path: "subjects_ref",
            populate: {
                path: "chapters_ref",
            },
        })
            .exec();
        const classesWithGrades = [];
        for (const classItem of classes) {
            const classObj = classItem.toObject();
            const resultsByChapter = yield resultsByChapterSchema_1.ResultsByChapter.find({
                class_ref: classObj._id,
            });
            const subjectsWithGrades = yield Promise.all(classObj.subjects_ref.map((subject) => __awaiter(void 0, void 0, void 0, function* () {
                const subjectObj = subject.toObject ? subject.toObject() : subject;
                const chaptersWithGrades = yield Promise.all(subjectObj.chapters_ref.map((chapter) => __awaiter(void 0, void 0, void 0, function* () {
                    const chapterObj = chapter.toObject
                        ? chapter.toObject()
                        : chapter;
                    const resultByChapter = resultsByChapter.find((result) => result.chapter_ref.equals(chapterObj._id));
                    let questions_done = "";
                    if (resultByChapter && resultByChapter.questions_done) {
                        questions_done = resultByChapter.questions_done;
                    }
                    else if (chapter.results_by_question_ref &&
                        chapter.results_by_question_ref.length > 0) {
                        questions_done =
                            chapter.results_by_question_ref[0].questions_done;
                    }
                    return Object.assign(Object.assign({}, chapterObj), { questions_done: questions_done });
                })));
                return Object.assign(Object.assign({}, subjectObj), { chapters_ref: chaptersWithGrades });
            })));
            classesWithGrades.push(Object.assign(Object.assign({}, classObj), { subjects_ref: subjectsWithGrades }));
        }
        res.json(classesWithGrades);
    }
    catch (error) {
        console.error("Error fetching classes:", error);
        res.status(500).json({ message: "Failed to fetch classes" });
    }
}));
// Get courses for dashboard
router.get("/courses/:userId", classController_4.getCoursesController);
exports.default = router;
