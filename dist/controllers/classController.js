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
exports.getCoursesController = exports.getYearsByCourse = exports.getClassesByCourseAndYear = exports.filterClassesByYears = void 0;
const classSchema_1 = require("../schemas/classSchema");
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const courseSchema_1 = require("../schemas/courseSchema");
const filterClassesByYears = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { years } = req.query;
    if (!years || !Array.isArray(years)) {
        res.status(400).json({ message: "Please provide a valid array of years." });
        return;
    }
    try {
        const yearNumbers = years
            .map((year) => parseInt(year, 10))
            .filter((year) => !isNaN(year));
        const classes = yield classSchema_1.Class.find({
            year_of_beginning: { $in: yearNumbers },
        });
        res.status(200).json(classes);
    }
    catch (error) {
        console.error("Error filtering classes:", error);
        res
            .status(500)
            .json({ message: "An error occurred while filtering classes." });
    }
});
exports.filterClassesByYears = filterClassesByYears;
const getYearsByCourse = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { courseId } = req.params;
        if (!courseId) {
            res.status(400).json({ message: "Course ID is required." });
            return;
        }
        const classes = yield classSchema_1.Class.find({ course_ref: courseId });
        const years = Array.from(new Set(classes.map((cls) => cls.year_of_beginning)));
        res.status(200).json(years);
    }
    catch (error) {
        console.error("Error fetching years by course:", error);
        res
            .status(500)
            .json({ message: "An error occurred while fetching years by course." });
    }
});
exports.getYearsByCourse = getYearsByCourse;
const getClassesByCourseAndYear = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { courseId, year } = req.params;
        if (!courseId || !year) {
            res.status(400).json({ message: "Course ID and year are required." });
            return;
        }
        const classes = yield classSchema_1.Class.find({
            course_ref: courseId,
            year_of_beginning: parseInt(year),
        });
        res.status(200).json(classes);
    }
    catch (error) {
        console.error("Error fetching classes for course and year:", error);
        res.status(500).json({
            message: "An error occurred while fetching classes for course and year.",
        });
    }
});
exports.getClassesByCourseAndYear = getClassesByCourseAndYear;
const getCoursesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const user = yield userSchema_1.default.findById(userId).populate("classes_ref");
        if (!user) {
            console.error(`User not found for ID: ${userId}`);
            res.status(404).json({ message: "User not found" });
            return;
        }
        let courses;
        if (user.role === "admin") {
            courses = yield courseSchema_1.Course.find();
        }
        else if (user.role === "teacher" && user.university_ref) {
            // Fetch courses associated with the teacher's university
            courses = yield courseSchema_1.Course.find({
                university_ref: user.university_ref,
            });
            const year = Number(req.query.year);
            // Filter the user's classes based on the year
            // const classesWithYear = (user.classes_ref as IClass[]).filter(
            //   (classRef) => classRef.year_of_beginning === year
            // );
            // console.log("classesWithYear", classesWithYear);
            // // Map class IDs for query
            // const classIds = classesWithYear.map((classRef: IClass) => classRef._id);
            // // Filter university courses that match the teacher's class IDs
            // courses = universityCourses.filter((course) =>
            //   course.classes_ref.some((classRef) => classIds.includes(classRef))
            // );
        }
        else {
            console.error(`Unauthorized access for user ID: ${userId}`);
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
        // const coursesWithYears = await Promise.all(
        //   courses.map(async (course: any) => {
        //     const classes = await Class.find({ course_ref: course._id });
        //     const years = classes.map((cls: any) => cls.year_of_beginning);
        //     return {
        //       _id: course._id,
        //       university_ref: course.university_ref,
        //       course_name: course.course_name,
        //       years: Array.from(new Set(years)), // Unique years
        //       classes: classes.map((cls: any) => ({
        //         _id: cls._id,
        //         year_of_beginning: cls.year_of_beginning,
        //         class_name: cls.class_name,
        //       })),
        //     };
        //   })
        // );
        res.status(200).json({ courses });
    }
    catch (error) {
        console.error("Error fetching courses:", error);
        res
            .status(500)
            .json({ message: "Error fetching courses. Please try again." });
    }
});
exports.getCoursesController = getCoursesController;
