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
const quizSchema_1 = require("../schemas/quizSchema");
const resultsByChapterSchema_1 = require("../schemas/resultsByChapterSchema");
const resultByQuestionSchema_1 = require("../schemas/resultByQuestionSchema");
const chapterSchema_1 = require("../schemas/chapterSchema");
const mongoose_1 = __importStar(require("mongoose"));
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const subjectSchema_1 = require("../schemas/subjectSchema");
const userSubjectProgressSchema_1 = __importDefault(require("../schemas/userSubjectProgressSchema"));
const userChapterProgressSchema_1 = __importDefault(require("../schemas/userChapterProgressSchema"));
const questionSchema_1 = __importDefault(require("../schemas/questionSchema"));
const timeTracker_1 = require("../schemas/timeTracker");
const totalQuestionDoneScheme_1 = __importDefault(require("../schemas/totalQuestionDoneScheme"));
const totoalCorrectQuestions_1 = __importDefault(require("../schemas/totoalCorrectQuestions"));
const router = express_1.default.Router();
function convertTimeToSeconds(timeString) {
    const [hoursStr, minutesStr, secondsStr] = timeString.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const seconds = parseInt(secondsStr, 10);
    return hours * 3600 + minutes * 60 + seconds;
}
function formatSecondsToHHMMSS(seconds) {
    const date = new Date(seconds * 1000);
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}
// Save quiz results
router.post("/:userId/:chapterId/results", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, chapterId } = req.params;
    const { quiz_mode, results_by_chapter, correct_answers_count, incorrect_answers_count, to_fill_user_answer, total_time_spent, answer_by_learn_mode, learn_correct_answers_count, learn_incorrect_answers_count, exam_correct_answers_count, exam_incorrect_answers_count, answer_by_exam_mode, } = req.body;
    // console.log("BODY: ", req.body);
    try {
        const userIdObj = new mongoose_1.default.Types.ObjectId(userId);
        const chapterIdObj = new mongoose_1.default.Types.ObjectId(chapterId);
        let quiz = yield quizSchema_1.Quiz.findOne({
            user_ref: userIdObj,
            chapters_ref: { $in: [chapterIdObj] },
            quiz_mode,
        });
        if (quiz) {
            // Step 2: Update the existing quiz if found
            // console.log("Quiz already exists. Updating it.");
            quiz.correct_answers_count = correct_answers_count;
            quiz.incorrect_answers_count = incorrect_answers_count;
            quiz.to_fill_user_answer = to_fill_user_answer;
            quiz.total_time_spent = total_time_spent;
            quiz.answer_by_learn_mode = answer_by_learn_mode;
            quiz.learn_correct_answers_count = learn_correct_answers_count;
            quiz.learn_incorrect_answers_count = learn_incorrect_answers_count;
            quiz.exam_correct_answers_count = exam_correct_answers_count;
            quiz.exam_incorrect_answers_count = exam_incorrect_answers_count;
            quiz.answer_by_exam_mode = answer_by_exam_mode;
            quiz.is_exam_mode = answer_by_exam_mode === "exam" ? true : false;
            // Save the updated quiz
            yield quiz.save();
        }
        else {
            // Step 3: Create a new quiz if no existing quiz is found
            console.log("No existing quiz found. Creating a new one.");
            quiz = new quizSchema_1.Quiz({
                chapters_ref: results_by_chapter.map((result) => new mongoose_1.default.Types.ObjectId(result.chapter_ref)),
                user_ref: userIdObj,
                quiz_mode,
                total_time_spent: "00:00:00",
                results_by_chapter_ref: [],
                date: new Date(),
                correct_answers_count,
                incorrect_answers_count,
                to_fill_user_answer,
                answer_by_learn_mode,
                learn_correct_answers_count,
                learn_incorrect_answers_count,
                exam_correct_answers_count,
                exam_incorrect_answers_count,
                answer_by_exam_mode,
                is_exam_mode: answer_by_exam_mode === "exam" ? true : false,
            });
        }
        let totalTimeSpent = 0;
        const questionDocs = [];
        const chapterResultsPromises = results_by_chapter.map((result) => __awaiter(void 0, void 0, void 0, function* () {
            const chapterIdObj = new mongoose_1.default.Types.ObjectId(result.chapter_ref);
            const chapter = yield chapterSchema_1.Chapter.findById(chapterIdObj);
            if (!chapter) {
                throw new Error("Chapter not found");
            }
            let resultsByChapter = yield resultsByChapterSchema_1.ResultsByChapter.findOne({
                chapter_ref: chapterIdObj,
                quiz_ref: {
                    $in: yield quizSchema_1.Quiz.find({ user_ref: userIdObj }).distinct("_id"),
                },
            });
            if (!resultsByChapter) {
                resultsByChapter = new resultsByChapterSchema_1.ResultsByChapter({
                    quiz_ref: quiz._id,
                    chapter_ref: chapterIdObj,
                    questions_done: "0%",
                    results_by_question_ref: [],
                    user_ref: userId,
                });
            }
            let isCorrectCount = 0;
            let isNotCorrectCount = 0;
            let notAnsweredYetCount = 0;
            for (const questionResult of result.results_by_question) {
                let { question_ref, is_correct, is_not_correct, time_spent_per_question, to_fill_user_answer, 
                // These fields will be retained if not provided in the request body
                is_learn_correct_answers, is_learn_incorrect_answers, learn_not_answered_yet, is_exam_correct_answers, is_exam_incorrect_answers, exam_fill_user_answer, // Extract exam_fill_user_answer here
                exam_not_answered_yet, done_by_mode, } = questionResult;
                console.log("Entering in the for loop!");
                const questionRefObj = new mongoose_1.default.Types.ObjectId(question_ref);
                is_correct = is_correct || false;
                is_not_correct = is_not_correct || false;
                let not_answered_yet = !is_correct && !is_not_correct;
                if (answer_by_exam_mode === "exam") {
                    console.log("Question done by ", answer_by_exam_mode);
                    // Default values
                    is_exam_correct_answers = is_exam_correct_answers || false;
                    is_exam_incorrect_answers = is_exam_incorrect_answers || false;
                    // New condition: if both exam correct and incorrect are false,
                    // but exam_fill_user_answer is present, set exam_not_answered_yet to true
                    if (
                    // !is_exam_correct_answers &&
                    // !is_exam_incorrect_answers &&
                    exam_fill_user_answer) {
                        console.log("Setting exam_not_answered_yet to true due to no correct/incorrect answers but fill_user_answer is present.");
                        exam_not_answered_yet = true;
                        is_exam_correct_answers = false;
                        is_exam_incorrect_answers = false;
                    }
                }
                // Fetch the existing question result if it exists
                let resultsByQuestion = yield resultByQuestionSchema_1.ResultsByQuestion.findOne({
                    results_by_chapter_ref: resultsByChapter._id,
                    question_ref: questionRefObj,
                });
                if (resultsByQuestion) {
                    console.log("Found results by question");
                    // Retain previous values for learn-related fields if not provided in the request
                    // Always update exam-related fields if the mode is exam
                    // Check if exam_fill_user_answer exists and update accordingly
                    if (exam_fill_user_answer) {
                        resultsByQuestion.exam_fill_user_answer = exam_fill_user_answer;
                        resultsByQuestion.exam_not_answered_yet = true;
                    }
                    else if (answer_by_exam_mode === "exam") {
                        // If no exam_fill_user_answer, proceed with normal correct/incorrect update
                        resultsByQuestion.is_exam_correct_answers =
                            is_exam_correct_answers;
                        resultsByQuestion.is_exam_incorrect_answers =
                            is_exam_incorrect_answers;
                        resultsByQuestion.exam_not_answered_yet = exam_not_answered_yet;
                        resultsByQuestion.done_by_mode = quiz_mode;
                    }
                    if ((answer_by_learn_mode && learn_correct_answers_count > 0) ||
                        learn_incorrect_answers_count > 0) {
                        // ** ISSUE NOT FOUND HERE
                        console.log("ARE WE UPDATING THIS STEP 1");
                        is_learn_correct_answers =
                            resultsByQuestion.is_learn_correct_answers;
                        is_learn_incorrect_answers =
                            resultsByQuestion.is_learn_incorrect_answers;
                        learn_not_answered_yet =
                            resultsByQuestion.learn_not_answered_yet;
                    }
                }
                else {
                    console.log("updating the fields learn");
                    // Set default values if there is no existing result
                    is_learn_correct_answers = is_learn_correct_answers || false;
                    is_learn_incorrect_answers = is_learn_incorrect_answers || false;
                    learn_not_answered_yet =
                        !is_learn_correct_answers && !is_learn_incorrect_answers;
                    is_exam_correct_answers = is_exam_correct_answers || false;
                    is_exam_incorrect_answers = is_exam_incorrect_answers || false;
                    exam_not_answered_yet =
                        !is_exam_correct_answers && !is_exam_incorrect_answers;
                }
                if (
                // !is_exam_correct_answers &&
                // !is_exam_incorrect_answers &&
                exam_fill_user_answer) {
                    console.log("Setting exam_not_answered_yet to true due to no correct/incorrect answers but fill_user_answer is present.");
                    exam_not_answered_yet = true;
                    is_exam_correct_answers = false;
                    is_exam_incorrect_answers = false;
                }
                // Handle transitions based on correct/incorrect answers
                if (is_not_correct &&
                    answer_by_learn_mode === "learn" &&
                    (learn_correct_answers_count > 0 ||
                        learn_incorrect_answers_count > 0)) {
                    is_learn_incorrect_answers = true;
                    is_learn_correct_answers = false; // Make sure correct is false
                    learn_not_answered_yet = false; // Mark it as answered
                }
                else if (is_correct &&
                    answer_by_learn_mode === "learn" &&
                    (learn_correct_answers_count > 0 ||
                        learn_incorrect_answers_count > 0)) {
                    is_learn_correct_answers = true;
                    is_learn_incorrect_answers = false;
                    learn_not_answered_yet = false;
                }
                if (answer_by_exam_mode === "exam" &&
                    exam_incorrect_answers_count > 0 &&
                    !exam_fill_user_answer) {
                    is_exam_incorrect_answers = true;
                    is_exam_correct_answers = false; // Make sure correct is false
                    exam_not_answered_yet = false; // Mark it as answered
                    done_by_mode = quiz_mode;
                }
                else if (answer_by_exam_mode === "exam" &&
                    exam_correct_answers_count > 0 &&
                    !exam_fill_user_answer) {
                    is_exam_correct_answers = true;
                    is_exam_incorrect_answers = false;
                    exam_not_answered_yet = false;
                    done_by_mode = quiz_mode;
                }
                const timeSpentSeconds = parseFloat(time_spent_per_question);
                const formattedTime = formatSecondsToHHMMSS(timeSpentSeconds);
                totalTimeSpent += not_answered_yet ? 0 : timeSpentSeconds;
                if (!resultsByQuestion) {
                    // Create new resultsByQuestion if it doesn't exist
                    console.log("Creating new resultsByQuestion");
                    resultsByQuestion = new resultByQuestionSchema_1.ResultsByQuestion({
                        results_by_chapter_ref: resultsByChapter._id,
                        question_ref: questionRefObj,
                        is_correct,
                        is_not_correct,
                        not_answered_yet,
                        to_fill_user_answer,
                        time_spent_per_question: not_answered_yet
                            ? "00:00:00"
                            : formattedTime,
                        done_by_mode: !not_answered_yet ? quiz_mode : undefined,
                        is_learn_correct_answers,
                        is_learn_incorrect_answers,
                        learn_not_answered_yet,
                        answer_by_learn_mode,
                        is_exam_correct_answers, // Only set if exam_fill_user_answer is not present
                        is_exam_incorrect_answers, // Only set if exam_fill_user_answer is not present
                        exam_not_answered_yet, // Set to true if exam_fill_user_answer is present
                        answer_by_exam_mode,
                        exam_fill_user_answer: answer_by_exam_mode === "exam"
                            ? exam_fill_user_answer
                            : undefined, // Set exam_fill_user_answer conditionally
                    });
                }
                else {
                    if (resultsByQuestion.is_correct) {
                        if (!is_correct && is_not_correct) {
                            console.log("Incorrect answer update");
                            // Transitioning from correct to incorrect
                            resultsByQuestion.is_correct = false;
                            resultsByQuestion.is_not_correct = true;
                            resultsByQuestion.not_answered_yet = false;
                            if (answer_by_learn_mode === "learn" &&
                                (learn_correct_answers_count > 0 ||
                                    learn_incorrect_answers_count > 0)) {
                                resultsByQuestion.is_learn_correct_answers = false;
                                resultsByQuestion.is_learn_incorrect_answers = true;
                                resultsByQuestion.learn_not_answered_yet = false;
                            }
                            if (answer_by_exam_mode === "exam" &&
                                (exam_correct_answers_count > 0 ||
                                    exam_incorrect_answers_count > 0)) {
                                resultsByQuestion.is_exam_correct_answers = false;
                                resultsByQuestion.is_exam_incorrect_answers = true;
                                // Save exam_fill_user_answer if in exam mode
                                resultsByQuestion.exam_fill_user_answer =
                                    exam_fill_user_answer;
                            }
                            resultsByQuestion.time_spent_per_question = formattedTime;
                            resultsByQuestion.done_by_mode = quiz_mode;
                        }
                    }
                    else if (resultsByQuestion.is_not_correct) {
                        if (is_correct && !is_not_correct) {
                            console.log("Correct answer update");
                            // Transitioning from incorrect to correct
                            resultsByQuestion.is_correct = true;
                            resultsByQuestion.is_not_correct = false;
                            resultsByQuestion.not_answered_yet = false;
                            if (answer_by_learn_mode === "learn" &&
                                (learn_correct_answers_count > 0 ||
                                    learn_incorrect_answers_count > 0)) {
                                resultsByQuestion.is_learn_correct_answers = true;
                                resultsByQuestion.is_learn_incorrect_answers = false;
                                resultsByQuestion.learn_not_answered_yet = false;
                            }
                            if (answer_by_exam_mode === "exam" &&
                                (exam_correct_answers_count > 0 ||
                                    exam_incorrect_answers_count > 0)) {
                                resultsByQuestion.is_exam_correct_answers = true;
                                resultsByQuestion.is_exam_incorrect_answers = false;
                                // Save exam_fill_user_answer if in exam mode
                                resultsByQuestion.exam_fill_user_answer =
                                    exam_fill_user_answer;
                            }
                            resultsByQuestion.time_spent_per_question = formattedTime;
                            resultsByQuestion.done_by_mode = quiz_mode;
                        }
                    }
                    else {
                        // Updating if previously unanswered or newly answered
                        resultsByQuestion.is_correct = is_correct;
                        resultsByQuestion.is_not_correct = is_not_correct;
                        resultsByQuestion.not_answered_yet = not_answered_yet;
                        if ((answer_by_learn_mode && learn_correct_answers_count > 0) ||
                            learn_incorrect_answers_count > 0) {
                            // ** ISSUE NOT FOUND HERE
                            console.log("ARE WE UPDATING THIS STEP 2");
                            resultsByQuestion.is_learn_correct_answers =
                                is_learn_correct_answers;
                            resultsByQuestion.is_learn_incorrect_answers =
                                is_learn_incorrect_answers;
                            resultsByQuestion.learn_not_answered_yet =
                                learn_not_answered_yet;
                        }
                        if ((answer_by_exam_mode && exam_correct_answers_count > 0) ||
                            exam_incorrect_answers_count > 0) {
                            resultsByQuestion.is_exam_correct_answers =
                                is_exam_correct_answers;
                            resultsByQuestion.is_exam_incorrect_answers =
                                is_exam_incorrect_answers;
                            resultsByQuestion.exam_not_answered_yet =
                                exam_not_answered_yet;
                            // Save exam_fill_user_answer if in exam mode
                            if (answer_by_exam_mode === "exam") {
                                resultsByQuestion.exam_fill_user_answer =
                                    exam_fill_user_answer;
                            }
                        }
                        resultsByQuestion.time_spent_per_question = not_answered_yet
                            ? "00:00:00"
                            : formattedTime;
                        resultsByQuestion.done_by_mode = !not_answered_yet
                            ? quiz_mode
                            : undefined;
                    }
                }
                yield resultsByQuestion.save();
                questionDocs.push(resultsByQuestion);
                if (resultsByQuestion.is_correct)
                    isCorrectCount++;
                if (resultsByQuestion.is_not_correct)
                    isNotCorrectCount++;
                if (resultsByQuestion.not_answered_yet)
                    notAnsweredYetCount++;
                if (!resultsByChapter.results_by_question_ref.includes(resultsByQuestion._id)) {
                    resultsByChapter.results_by_question_ref.push(resultsByQuestion._id);
                }
            }
            const totalQuestionsInChapter = isCorrectCount + isNotCorrectCount + notAnsweredYetCount;
            const totalDone = isCorrectCount + isNotCorrectCount;
            resultsByChapter.questions_done =
                totalQuestionsInChapter === 0
                    ? "0%"
                    : `${Math.round((totalDone / totalQuestionsInChapter) * 100)}%`;
            yield resultsByChapter.save();
            return resultsByChapter;
        }));
        const resultsByChapters = yield Promise.all(chapterResultsPromises);
        quiz.results_by_chapter_ref = resultsByChapters.map((chapterResult) => chapterResult._id);
        quiz.total_time_spent = total_time_spent;
        yield quiz.save();
        yield userSchema_1.default.findByIdAndUpdate(userIdObj, { $push: { quizzes_ref: quiz._id } }, { new: true, useFindAndModify: false });
        res.status(201).json({
            quiz,
            resultsByChapter: resultsByChapters,
            resultsByQuestion: questionDocs,
        });
    }
    catch (error) {
        console.error("Error saving quiz results:", error);
        res.status(500).json({ message: "Failed to save quiz results" });
    }
}));
// Get all quiz results for a specific user
router.get("/:userId/stats", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    try {
        const user = yield userSchema_1.default.findById(userId)
            .populate({
            path: "quizzes_ref",
            populate: {
                path: "results_by_chapter_ref",
                populate: {
                    path: "results_by_question_ref",
                },
            },
        })
            .populate({
            path: "classes_ref",
            populate: {
                path: "subjects_ref",
                populate: {
                    path: "chapters_ref",
                    populate: {
                        path: "questions_ref",
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({ message: "Failed to fetch user details" });
    }
}));
// Get total time spent and total time per mode
router.get("/:userId/total-time-spent", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    try {
        const user = yield userSchema_1.default.findById(userId).populate({
            path: "quizzes_ref",
            populate: {
                path: "chapters_ref",
                model: chapterSchema_1.Chapter,
                populate: {
                    path: "subject_ref",
                    model: "Subject",
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let totalTimeSpentSeconds = 0;
        const modes = ["learn", "random", "exam"];
        const timeSpentByMode = {};
        const timeRef = [];
        modes.forEach((mode) => {
            timeSpentByMode[mode] = 0;
        });
        const timeSpentByDate = {};
        if (user.quizzes_ref) {
            user.quizzes_ref.forEach((quiz) => {
                if (quiz.total_time_spent && quiz.quiz_mode && quiz.chapters_ref) {
                    const totalSeconds = convertTimeToSeconds(quiz.total_time_spent);
                    totalTimeSpentSeconds += totalSeconds;
                    // Add time spent to the corresponding mode
                    const mode = quiz.quiz_mode;
                    if (mode in timeSpentByMode) {
                        timeSpentByMode[mode] += totalSeconds;
                    }
                    else {
                        timeSpentByMode[mode] = totalSeconds;
                    }
                    // Track time spent by date
                    const date = new Date(quiz.date).toISOString().split("T")[0];
                    if (timeSpentByDate[date]) {
                        timeSpentByDate[date] += totalSeconds;
                    }
                    else {
                        timeSpentByDate[date] = totalSeconds;
                    }
                }
            });
            // Populate the timeRef array with formatted time spent by date
            for (const date in timeSpentByDate) {
                timeRef.push({
                    date,
                    total_time_spent: formatSecondsToHHMMSS(timeSpentByDate[date]),
                });
            }
        }
        const formattedTotalTimeSpent = formatSecondsToHHMMSS(totalTimeSpentSeconds);
        res.json({
            total_time_spent: formattedTotalTimeSpent,
            time_spent_by_mode: timeSpentByMode,
            time_ref: timeRef,
        });
    }
    catch (error) {
        console.error("Error fetching total time spent:", error);
        res.status(500).json({ message: "Failed to fetch total time spent" });
    }
}));
// ** Questions done per date
router.get("/:userId/questions-per-date", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const userObjectId = new mongoose_1.Types.ObjectId(userId);
        // Fetch all quizzes related to the user and group them by date
        const quizzesGroupedByDate = yield quizSchema_1.Quiz.aggregate([
            {
                $match: {
                    user_ref: userObjectId,
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    quizzes: { $push: "$$ROOT" }, // Keep all quizzes in an array
                    totalQuestions: { $sum: 1 }, // Count the total quizzes per date
                },
            },
            {
                $sort: { _id: 1 }, // Sort by date
            },
        ]);
        // Now look up the results for each quiz and calculate correct answers
        const results = yield resultByQuestionSchema_1.ResultsByQuestion.aggregate([
            {
                $lookup: {
                    from: "resultsbychapters",
                    localField: "results_by_chapter_ref",
                    foreignField: "_id",
                    as: "results_by_chapter",
                },
            },
            {
                $unwind: "$results_by_chapter",
            },
            {
                $lookup: {
                    from: "quizzes",
                    localField: "results_by_chapter.quiz_ref",
                    foreignField: "_id",
                    as: "quiz",
                },
            },
            {
                $unwind: "$quiz",
            },
            {
                $match: {
                    "quiz.user_ref": userObjectId,
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$quiz.date" } },
                    correctAnswers: {
                        $sum: {
                            $cond: {
                                if: { $ne: ["$is_exam_correct_answers", null] }, // Check if is_exam_correct_answers is not null
                                then: {
                                    $cond: ["$is_exam_correct_answers", 1, 0], // If is_exam_correct_answers is true, add 1, else 0
                                },
                                else: { $cond: ["$is_correct", 1, 0] }, // If is_exam_correct_answers is null, fallback to is_correct
                            },
                        },
                    },
                    questionsDone: { $sum: 1 }, // Count the total number of questions per date
                },
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    correctAnswers: 1,
                    questionsDone: 1,
                },
            },
            {
                $sort: { date: 1 },
            },
        ]);
        // console.log("RESULT---", { results });
        // Merge quiz data with results to ensure all dates are covered
        const stats = quizzesGroupedByDate.map((quizGroup) => {
            const resultForDate = results.find((result) => result.date === quizGroup._id);
            return {
                date: quizGroup._id,
                questionsDone: quizGroup.totalQuestions, // Total quizzes (questions done) for the date
                correctAnswers: resultForDate ? resultForDate.correctAnswers : 0,
            };
        });
        // Calculate the total questions done and correct answers
        const totalQuestionsDone = quizzesGroupedByDate.reduce((sum, quizGroup) => sum + quizGroup.totalQuestions, 0);
        const totalCorrectAnswers = stats.reduce((sum, stat) => sum + stat.correctAnswers, 0);
        res.json({
            totals: {
                questionsDone: totalQuestionsDone,
                correctAnswers: totalCorrectAnswers,
            },
            stats,
        });
    }
    catch (error) {
        console.error("Error fetching questions stats per date:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
router.get("/:userId/correct/questions-per-date", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const userObjectId = new mongoose_1.Types.ObjectId(userId);
        // Fetch correct answers grouped by date and mode from TotalCorrectQuestion collection
        const correctAnswers = yield totoalCorrectQuestions_1.default.find({
            user_ref: userObjectId,
        });
        // Group correct answers by date and mode
        const correctAnswersByDate = correctAnswers.reduce((acc, entry) => {
            const dateStr = entry.date.toISOString().split("T")[0]; // Extract date string in 'YYYY-MM-DD' format
            if (!acc[dateStr]) {
                acc[dateStr] = { totalCorrectAnswers: 0, modes: [] };
            }
            acc[dateStr].totalCorrectAnswers += entry.counts;
            acc[dateStr].modes.push({
                mode: entry.mode,
                correctAnswers: entry.counts,
            });
            return acc;
        }, {});
        // Prepare stats based on the correct answers data
        const stats = Object.keys(correctAnswersByDate).map((date) => {
            const resultForDate = correctAnswersByDate[date];
            return {
                date,
                questionsDone: resultForDate.totalCorrectAnswers, // Since we are only counting correct answers
                correctAnswers: resultForDate.totalCorrectAnswers,
                modes: resultForDate.modes,
            };
        });
        // Calculate the total questions done and correct answers
        const totalQuestionsDone = stats.reduce((sum, stat) => sum + stat.questionsDone, 0);
        const totalCorrectAnswers = stats.reduce((sum, stat) => sum + stat.correctAnswers, 0);
        res.json({
            totals: {
                questionsDone: totalQuestionsDone,
                correctAnswers: totalCorrectAnswers,
            },
            stats,
        });
    }
    catch (error) {
        console.error("Error fetching questions stats per date:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// ** new question done per date
router.get("/:userId/questions-per-date-new", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const userObjectId = new mongoose_1.Types.ObjectId(userId);
        // Fetch total questions done by user and group by date (without considering mode)
        const questionsGroupedByDate = yield totalQuestionDoneScheme_1.default.aggregate([
            {
                $match: {
                    user_ref: userObjectId,
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, // Group by date only
                    totalQuestions: { $sum: "$total_questions_done" }, // Sum total questions done per date
                },
            },
            {
                $sort: { _id: 1 }, // Sort by date
            },
        ]);
        // Prepare the stats by mapping over grouped results
        const stats = questionsGroupedByDate.map((questionGroup) => ({
            date: questionGroup._id,
            questionsDone: questionGroup.totalQuestions, // Total questions done per date (sum across all modes)
        }));
        // Calculate the total questions done
        const totalQuestionsDone = questionsGroupedByDate.reduce((sum, questionGroup) => sum + questionGroup.totalQuestions, 0);
        // Send the response
        res.json({
            totals: {
                questionsDone: totalQuestionsDone,
                correctAnswers: 0, // If you need to track correct answers separately, this is a placeholder
            },
            stats,
        });
    }
    catch (error) {
        console.error("Error fetching questions stats per date:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get time per date
router.get("/:userId/time-spent-per-date", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const quizzes = yield quizSchema_1.Quiz.find({
            user_ref: userId,
        })
            .populate("results_by_chapter_ref")
            .exec();
        if (!quizzes || quizzes.length === 0) {
            return res
                .status(404)
                .json({ message: "No quizzes found for this user" });
        }
        const timeSpentPerDate = {};
        quizzes.forEach((quiz) => {
            const dateKey = quiz.date.toISOString().split("T")[0];
            const timeParts = quiz.total_time_spent.split(":").map(Number);
            // Convert the time to seconds
            const timeInSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            if (timeSpentPerDate[dateKey]) {
                timeSpentPerDate[dateKey] += timeInSeconds;
            }
            else {
                timeSpentPerDate[dateKey] = timeInSeconds;
            }
        });
        // Format the result, converting total time spent back to HH:MM:SS
        const formattedResult = Object.entries(timeSpentPerDate).map(([date, seconds]) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            // Format time as HH:MM:SS
            const formattedTime = [
                hours.toString().padStart(2, "0"),
                minutes.toString().padStart(2, "0"),
                remainingSeconds.toString().padStart(2, "0"),
            ].join(":");
            return { date, total_time_spent: formattedTime };
        });
        res.json(formattedResult);
    }
    catch (error) {
        console.error("Error fetching time spent per date:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get all questions number from all classes by user (excluding not available chapters)
router.get("/:userId/total_questions", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    try {
        const totalQuestions = yield userSchema_1.default.aggregate([
            { $match: { _id: new mongoose_1.default.Types.ObjectId(userId) } },
            { $unwind: "$classes_ref" },
            {
                $lookup: {
                    from: "classes",
                    localField: "classes_ref",
                    foreignField: "_id",
                    as: "class",
                },
            },
            { $unwind: "$class" },
            { $unwind: "$class.subjects_ref" },
            {
                $lookup: {
                    from: "subjects",
                    localField: "class.subjects_ref",
                    foreignField: "_id",
                    as: "subject",
                },
            },
            { $unwind: "$subject" },
            { $unwind: "$subject.chapters_ref" },
            {
                $lookup: {
                    from: "chapters",
                    localField: "subject.chapters_ref",
                    foreignField: "_id",
                    as: "chapter",
                },
            },
            { $unwind: "$chapter" },
            { $match: { "chapter.is_available": true } },
            {
                $group: {
                    _id: null,
                    totalQuestions: { $sum: "$chapter.number_of_questions" },
                },
            },
        ]);
        res.json({
            totalQuestions: totalQuestions.length > 0 ? totalQuestions[0].totalQuestions : 0,
        });
    }
    catch (error) {
        console.error("Error fetching classes and calculating questions:", error);
        res.status(500).json({ message: "Server error" });
    }
}));
// ** Get questions done by subject and chapter
router.get("/:userId/questions-by-subject", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        // Fetch the user's university_ref to filter chapters by university
        const user = yield userSchema_1.default.findById(userObjectId)
            .select("university_ref")
            .lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Fetch all subjects for the user's university
        const allSubjects = yield subjectSchema_1.Subject.find({
            university_ref: user.university_ref,
        }).lean();
        // Fetch all chapters for the user's university
        const allChapters = yield chapterSchema_1.Chapter.find({
            university_ref: user.university_ref,
        }).lean();
        // Fetch all questions for the university's chapters
        const allQuestions = yield questionSchema_1.default.find({
            chapter_ref: { $in: allChapters.map((chapter) => chapter._id) },
        }).lean();
        // Fetch all chapter progress for the user, grouped by chapter and user
        const chapterProgresses = yield userChapterProgressSchema_1.default.aggregate([
            {
                $match: {
                    user_ref: userObjectId,
                    chapter_ref: {
                        $in: allChapters.map((chapter) => chapter._id),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        chapter_ref: "$chapter_ref",
                        user_ref: "$user_ref",
                    },
                    total_questions_done: {
                        $sum: "$total_questions_done",
                    },
                },
            },
        ]).exec();
        // Structure the result
        const fullResult = allSubjects.map((subject) => {
            // Find all chapters related to this subject
            const subjectChapters = allChapters.filter((chapter) => chapter.subject_ref.equals(subject._id));
            // Map chapters data with question counts and progress
            const chapters = subjectChapters.map((chapter) => {
                // Find the number of questions in the chapter
                const chapterQuestions = allQuestions.filter((question) => question.chapter_ref.equals(chapter._id));
                // Get the progress for this chapter for the user
                const chapterProgress = chapterProgresses.find((progress) => progress._id.chapter_ref.equals(chapter._id));
                return {
                    chapterId: chapter._id,
                    chapterName: chapter.chapter_name,
                    questionCount: chapterProgress
                        ? chapterProgress.total_questions_done
                        : 0,
                    totalQuestions: chapterQuestions.length,
                };
            });
            // Calculate total question count for the subject
            const totalQuestionCount = chapters.reduce((acc, chapter) => acc + chapter.questionCount, 0);
            return {
                subjectId: subject._id,
                subjectName: subject.subject_name,
                chapters,
                totalQuestionCount,
            };
        });
        // Send the result back to the client
        res.status(200).json(fullResult);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}));
// Get questions done by mode
router.get("/:userId/questions-done-by-mode", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        // Find the user to ensure it exists
        const user = yield userSchema_1.default.findById(userId).exec();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Fetch the user chapter progress to get questions done by mode
        const userChapterProgresses = yield userChapterProgressSchema_1.default.find({
            user_ref: userId,
        }).exec();
        // Aggregate the total questions done by mode
        const questionsByMode = {};
        userChapterProgresses.forEach((progress) => {
            const mode = progress.mode;
            if (!questionsByMode[mode]) {
                questionsByMode[mode] = 0;
            }
            questionsByMode[mode] += progress.total_questions_done;
        });
        // console.log("questionsByMode", { questionsByMode });
        res.status(200).json(questionsByMode);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error });
    }
}));
// get subject progress
router.get("/:userId/:subjectId/subject-progress", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, subjectId } = req.params;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const subjectObjectId = new mongoose_1.default.Types.ObjectId(subjectId);
        const result = yield userSubjectProgressSchema_1.default.find({
            user_ref: userObjectId,
            subject_ref: subjectObjectId,
        }).populate("subject_ref", "subject_name");
        if (result.length === 0) {
            return res.status(200).json([{ total_questions_done: 0 }]);
        }
        return res.status(200).json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}));
// Update subject progress for a user
router.post("/:userId/:subjectId/subject-progress", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, subjectId } = req.params;
    const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
    const subjectObjectId = new mongoose_1.default.Types.ObjectId(subjectId);
    try {
        // Use findOneAndUpdate with upsert: true to either update or create a new document
        const progress = yield userSubjectProgressSchema_1.default.findOneAndUpdate({
            user_ref: userObjectId,
            subject_ref: subjectObjectId,
        }, {
            $inc: { total_questions_done: 1 }, // Increment the total_questions_done count
        }, {
            new: true, // Return the updated document
            upsert: true, // Create a new document if one doesn't exist
        });
        res.status(200).json({
            subjectId: progress.subject_ref,
            total_questions_done: progress.total_questions_done,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}));
// get chapter progress
router.get("/:userId/:chapterId/chapter-progress", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, chapterId } = req.params;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const chapterObjectId = new mongoose_1.default.Types.ObjectId(chapterId);
        const result = yield userChapterProgressSchema_1.default.find({
            user_ref: userObjectId,
            chapter_ref: chapterObjectId,
        });
        if (result.length === 0) {
            return res.status(200).json([{ total_questions_done: 0 }]);
        }
        return res.status(200).json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}));
// Update chapter progress for a user
router.post("/:userId/:chapterId/chapter-progress", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, chapterId } = req.params;
    const { mode } = req.body;
    const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
    const chapterObjectId = new mongoose_1.default.Types.ObjectId(chapterId);
    try {
        // Use findOneAndUpdate with upsert: true to either update or create a new document
        const progress = yield userChapterProgressSchema_1.default.findOneAndUpdate({
            user_ref: userObjectId,
            chapter_ref: chapterObjectId,
            mode,
        }, {
            $inc: { total_questions_done: 1 }, // Increment the total_questions_done count
        }, {
            new: true, // Return the updated document
            upsert: true, // Create a new document if one doesn't exist
        });
        res.status(200).json({
            chapterId: progress.chapter_ref,
            total_questions_done: progress.total_questions_done,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}));
// // Get correct answers by mode
// router.get(
//   "/:userId/correct-answered-by-mode",
//   async (req: Request, res: Response) => {
//     try {
//       const { userId } = req.params;
//       if (!mongoose.Types.ObjectId.isValid(userId)) {
//         return res.status(400).json({ message: "Invalid user ID" });
//       }
//       // Fetch all quizzes associated with the user
//       const quizzes = await Quiz.find({ user_ref: userId }).exec();
//       if (!quizzes || quizzes.length === 0) {
//         return res
//           .status(404)
//           .json({ message: "No quizzes found for this user" });
//       }
//       // Create a map of chapters to track both learn, exam, and random modes
//       const chapterModeMap = new Map<
//         string,
//         { learn: boolean; exam: boolean; random: boolean }
//       >();
//       quizzes.forEach((quiz: any) => {
//         quiz.chapters_ref.forEach((chapterId: any) => {
//           const chapterIdString = chapterId.toString();
//           const isExamMode = quiz.is_exam_mode || false;
//           const isRandomMode = quiz.quiz_mode === "random" || false;
//           // Initialize if not present
//           if (!chapterModeMap.has(chapterIdString)) {
//             chapterModeMap.set(chapterIdString, {
//               learn: false,
//               exam: false,
//               random: false,
//             });
//           }
//           // Update the map based on quiz mode
//           const modeInfo: any = chapterModeMap.get(chapterIdString);
//           if (isExamMode) {
//             modeInfo!.exam = true;
//           } else if (isRandomMode) {
//             modeInfo!.random = true;
//           } else {
//             modeInfo!.learn = true;
//           }
//           chapterModeMap.set(chapterIdString, modeInfo!);
//         });
//       });
//       // Fetch ResultsByChapter using the quiz IDs
//       const quizIds = quizzes.map((quiz: any) => quiz._id);
//       const resultsByChapters = await ResultsByChapter.find({
//         quiz_ref: { $in: quizIds },
//       }).exec();
//       // Fetch ResultsByQuestion using the ResultsByChapter references
//       const resultsByQuestions = await ResultsByQuestion.find({
//         results_by_chapter_ref: {
//           $in: resultsByChapters.map((chapter) => chapter._id),
//         },
//       }).exec();
//       if (resultsByQuestions.length === 0) {
//         console.warn(
//           "No ResultsByQuestion found for the given quiz/chapter references."
//         );
//       }
//       // Fetch total_questions_done from TotalQuestionDone for learn, exam, and random modes
//       const totalQuestionsDone = await TotalQuestionDone.find({
//         user_ref: userId,
//         mode: { $in: ["learn", "exam", "random"] },
//       }).exec();
//       // Initialize both modes
//       const correctAnswersByMode: Record<
//         string,
//         {
//           totalCorrectCount: number;
//           totalIncorrectCount: number;
//           totalQuestionCount: number;
//         }
//       > = {
//         learn: {
//           totalCorrectCount: 0,
//           totalIncorrectCount: 0,
//           totalQuestionCount: 0,
//         },
//         exam: {
//           totalCorrectCount: 0,
//           totalIncorrectCount: 0,
//           totalQuestionCount: 0,
//         },
//         random: {
//           totalCorrectCount: 0,
//           totalIncorrectCount: 0,
//           totalQuestionCount: 0,
//         },
//       };
//       // Process results and count them for each mode
//       resultsByQuestions.forEach((result) => {
//         const resultByChapter = resultsByChapters.find(
//           (chapter: any) =>
//             chapter._id.toString() === result.results_by_chapter_ref.toString()
//         );
//         if (!resultByChapter) return;
//         const chapterId = resultByChapter.chapter_ref.toString();
//         const modeInfo: any = chapterModeMap.get(chapterId);
//         if (!modeInfo) return;
//         // Learn mode handling
//         if (modeInfo.learn && result.answer_by_learn_mode === "learn") {
//           correctAnswersByMode["learn"].totalQuestionCount++;
//           if (result.is_learn_correct_answers) {
//             correctAnswersByMode["learn"].totalCorrectCount++;
//           } else if (result.is_learn_incorrect_answers) {
//             correctAnswersByMode["learn"].totalIncorrectCount++;
//           }
//         }
//         // Random mode handling
//         if (modeInfo.random && result.done_by_mode === "random") {
//           correctAnswersByMode["random"].totalQuestionCount++;
//           if (result.is_correct) {
//             correctAnswersByMode["random"].totalCorrectCount++;
//           } else if (result.is_not_correct) {
//             correctAnswersByMode["random"].totalIncorrectCount++;
//           }
//         }
//         // Exam mode handling
//         if (modeInfo.exam) {
//           correctAnswersByMode["exam"].totalQuestionCount++;
//           if (result.is_exam_correct_answers) {
//             correctAnswersByMode["exam"].totalCorrectCount++;
//           } else if (result.is_exam_incorrect_answers) {
//             correctAnswersByMode["exam"].totalIncorrectCount++;
//           }
//         }
//       });
//       // Include total_questions_done from TotalQuestionDone
//       totalQuestionsDone.forEach((progress) => {
//         const mode = progress.mode;
//         if (mode === "learn" || mode === "random" || mode === "exam") {
//           correctAnswersByMode[mode].totalQuestionCount =
//             progress.total_questions_done;
//         }
//       });
//       // Format the response data
//       const responseData = Object.keys(correctAnswersByMode).map((mode) => ({
//         mode,
//         totalCorrectCount: correctAnswersByMode[mode].totalCorrectCount,
//         totalIncorrectCount: correctAnswersByMode[mode].totalIncorrectCount,
//         totalQuestionCount: correctAnswersByMode[mode].totalQuestionCount,
//       }));
//       // Returning the aggregated data
//       res.status(200).json({
//         modes: responseData,
//         totalQuestionCount: responseData.reduce(
//           (acc, curr) => acc + curr.totalQuestionCount,
//           0
//         ),
//         totalCorrectCount: responseData.reduce(
//           (acc, curr) => acc + curr.totalCorrectCount,
//           0
//         ),
//         totalIncorrectCount: responseData.reduce(
//           (acc, curr) => acc + curr.totalIncorrectCount,
//           0
//         ),
//       });
//     } catch (error) {
//       console.error("Server error:", error);
//       res.status(500).json({ message: "Server error", error });
//     }
//   }
// );
// Get correct answers by mode
router.get("/:userId/correct-answered-by-mode", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        // Create a map of chapters to track both learn, exam, and random modes
        const chapterModeMap = new Map();
        // Fetch all quizzes associated with the user
        const quizzes = yield quizSchema_1.Quiz.find({ user_ref: userId }).exec();
        if (!quizzes || quizzes.length === 0) {
            return res
                .status(404)
                .json({ message: "No quizzes found for this user" });
        }
        quizzes.forEach((quiz) => {
            quiz.chapters_ref.forEach((chapterId) => {
                const chapterIdString = chapterId.toString();
                const isExamMode = quiz.is_exam_mode || false;
                const isRandomMode = quiz.quiz_mode === "random" || false;
                // Initialize if not present
                if (!chapterModeMap.has(chapterIdString)) {
                    chapterModeMap.set(chapterIdString, {
                        learn: false,
                        exam: false,
                        random: false,
                    });
                }
                // Update the map based on quiz mode
                const modeInfo = chapterModeMap.get(chapterIdString);
                if (isExamMode) {
                    modeInfo.exam = true;
                }
                else if (isRandomMode) {
                    modeInfo.random = true;
                }
                else {
                    modeInfo.learn = true;
                }
                chapterModeMap.set(chapterIdString, modeInfo);
            });
        });
        // Fetch total_questions_done from TotalQuestionDone for learn, exam, and random modes
        const totalQuestionsDone = yield totalQuestionDoneScheme_1.default.find({
            user_ref: userId,
            mode: { $in: ["learn", "exam", "random"] },
        }).exec();
        // Fetch correct counts from TotalCorrectQuestions by mode and chapter
        const totalCorrectQuestions = yield totoalCorrectQuestions_1.default.find({
            user_ref: userId,
            mode: { $in: ["learn", "exam", "random"] },
        }).exec();
        // Initialize the result structure for learn, exam, and random modes
        const correctAnswersByMode = {
            learn: {
                totalCorrectCount: 0,
                totalIncorrectCount: 0,
                totalQuestionCount: 0,
            },
            exam: {
                totalCorrectCount: 0,
                totalIncorrectCount: 0,
                totalQuestionCount: 0,
            },
            random: {
                totalCorrectCount: 0,
                totalIncorrectCount: 0,
                totalQuestionCount: 0,
            },
        };
        console.log("totalCorrectQuestions", { totalCorrectQuestions });
        // Count correct answers for each mode from TotalCorrectQuestions
        totalCorrectQuestions.forEach((correctQuestion) => {
            const mode = correctQuestion.mode;
            if (mode === "learn" || mode === "random" || mode === "exam") {
                correctAnswersByMode[mode].totalCorrectCount +=
                    correctQuestion.counts;
            }
        });
        // Include total_questions_done from TotalQuestionDone
        totalQuestionsDone.forEach((progress) => {
            const mode = progress.mode;
            if (mode === "learn" || mode === "random" || mode === "exam") {
                correctAnswersByMode[mode].totalQuestionCount =
                    progress.total_questions_done;
            }
        });
        // Format the response data
        const responseData = Object.keys(correctAnswersByMode).map((mode) => ({
            mode,
            totalCorrectCount: correctAnswersByMode[mode].totalCorrectCount,
            totalIncorrectCount: correctAnswersByMode[mode].totalQuestionCount -
                correctAnswersByMode[mode].totalCorrectCount,
            totalQuestionCount: correctAnswersByMode[mode].totalQuestionCount,
        }));
        // Returning the aggregated data
        res.status(200).json({
            modes: responseData,
            totalQuestionCount: responseData.reduce((acc, curr) => acc + curr.totalQuestionCount, 0),
            totalCorrectCount: responseData.reduce((acc, curr) => acc + curr.totalCorrectCount, 0),
            totalIncorrectCount: responseData.reduce((acc, curr) => acc + curr.totalIncorrectCount, 0),
        });
    }
    catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: "Server error", error });
    }
}));
// Calculate time spent per chapter and per subject for quizzes of a specific user
const timeToSeconds = (time) => {
    if (time === "00:00:00")
        return 0;
    const [hours, minutes, seconds] = time.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
};
// Get time per subject and chapter
const getSubjectName = (subjectId) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = yield subjectSchema_1.Subject.findById(subjectId).exec();
    return (subject === null || subject === void 0 ? void 0 : subject.subject_name) || "";
});
// time tracking for subject and chapters
// Utility function to parse HH:MM:SS into seconds
function parseTimeStringToSeconds(timeStr) {
    const parts = timeStr.split(":").map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
}
// Utility function to convert seconds into HH:MM:SS format
function formatSecondsToTimeString(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
    ].join(":");
}
// POST endpoint to update or create chapter time spent
router.post("/:userId/:chapterId/chapter-time-spent", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, chapterId } = req.params;
    const { time_spent, mode } = req.body;
    try {
        const existingRecord = yield timeTracker_1.ChapterTime.findOne({
            user_ref: userId,
            chapter_ref: chapterId,
        });
        let newTimeSpent;
        if (existingRecord) {
            // Parse existing time and new time into seconds
            const existingTimeInSeconds = parseTimeStringToSeconds(existingRecord.time_spent);
            const newTimeInSeconds = parseTimeStringToSeconds(time_spent);
            // Add the times together
            const totalTimeInSeconds = existingTimeInSeconds + newTimeInSeconds;
            // Convert total time back to HH:MM:SS format
            newTimeSpent = formatSecondsToTimeString(totalTimeInSeconds);
            // Update the existing record with the new time
            existingRecord.time_spent = newTimeSpent;
            existingRecord.mode = mode;
            yield existingRecord.save();
        }
        else {
            // If no existing record, just save the new time as it is
            newTimeSpent = time_spent;
            const newChapterTime = new timeTracker_1.ChapterTime({
                chapter_ref: chapterId,
                user_ref: userId,
                time_spent: newTimeSpent,
                mode,
            });
            yield newChapterTime.save();
        }
        res
            .status(200)
            .json({ message: "Time spent updated successfully", newTimeSpent });
    }
    catch (error) {
        console.error("Error saving chapter time spent:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
router.get("/:userId/:chapterId/get-chap-time", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, chapterId } = req.params;
    try {
        // Query the database for the specific user and chapter
        const chapterTime = yield timeTracker_1.ChapterTime.findOne({
            user_ref: userId,
            chapter_ref: chapterId,
        });
        if (!chapterTime) {
            // If no record is found, send a 404 response
            return res.status(404).json({
                message: "Chapter time not found for the specified user and chapter.",
            });
        }
        // Send the found record as a JSON response
        res.status(200).json({
            userId: chapterTime.user_ref,
            chapterId: chapterTime.chapter_ref,
            time_spent: chapterTime.time_spent,
        });
    }
    catch (error) {
        console.error("Error retrieving chapter time:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
router.post("/:userId/:subjectId/subject-time-spent", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, subjectId } = req.params;
    const { time_spent, mode } = req.body;
    try {
        const existingRecord = yield timeTracker_1.SubjectTime.findOne({
            user_ref: userId,
            subject_ref: subjectId,
        });
        let newTimeSpent;
        if (existingRecord) {
            // Parse existing time and new time into seconds
            const existingTimeInSeconds = parseTimeStringToSeconds(existingRecord.total_time);
            const newTimeInSeconds = parseTimeStringToSeconds(time_spent);
            const totalTimeInSeconds = existingTimeInSeconds + newTimeInSeconds;
            newTimeSpent = formatSecondsToTimeString(totalTimeInSeconds);
            existingRecord.total_time = newTimeSpent;
            existingRecord.mode = mode;
            yield existingRecord.save();
        }
        else {
            newTimeSpent = time_spent;
            const newSubjectTime = new timeTracker_1.SubjectTime({
                subject_ref: subjectId,
                user_ref: userId,
                total_time: newTimeSpent,
                mode,
            });
            yield newSubjectTime.save();
        }
        res
            .status(200)
            .json({ message: "Time spent updated successfully", newTimeSpent });
    }
    catch (error) {
        console.error("Error saving subject time spent:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
router.get("/:userId/:subjectId/get-sub-time", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, subjectId } = req.params;
    try {
        // Query the database for the specific user and chapter
        const chapterTime = yield timeTracker_1.SubjectTime.findOne({
            user_ref: userId,
            subject_ref: subjectId,
        });
        if (!chapterTime) {
            // If no record is found, send a 404 response
            return res.status(404).json({
                message: "Chapter time not found for the specified user and chapter.",
            });
        }
        // Send the found record as a JSON response
        res.status(200).json({
            userId: chapterTime.user_ref,
            chapterId: chapterTime.subject_ref,
            time_spent: chapterTime.total_time,
        });
    }
    catch (error) {
        console.error("Error retrieving chapter time:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
// *********
router.get("/:userId/time-per-subject-and-chapter", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    try {
        // Fetch chapter times for the user and populate Chapter and Subject data
        const chapterTimes = yield timeTracker_1.ChapterTime.find({
            user_ref: userId,
        }).populate({
            path: "chapter_ref",
            populate: {
                path: "subject_ref", // Populate the subject reference within chapter
                model: "Subject",
            },
        });
        // Fetch subject times for the user and populate Subject data
        const subjectTimes = yield timeTracker_1.SubjectTime.find({
            user_ref: userId,
        }).populate("subject_ref");
        // console.log("ChapterTimes  and SubjecTimes", {
        //   chapterTimes,
        //   subjectTimes,
        // });
        const chapterTimeMap = {}; // Storing time as HH:MM:SS
        const subjectTimeMap = {};
        // Helper function to convert HH:MM:SS to seconds
        const convertTimeToSeconds = (time) => {
            const [hours, minutes, seconds] = time.split(":").map(Number);
            return hours * 3600 + minutes * 60 + seconds;
        };
        // Populate chapterTimeMap with the data from the database
        chapterTimes.forEach((chapterTime) => {
            const chapter = chapterTime.chapter_ref;
            if (chapter && chapter.subject_ref) {
                const chapterName = chapter.chapter_name;
                chapterTimeMap[chapterName] = chapterTime.time_spent;
            }
            else {
                console.warn(`Warning: Missing chapter or subject reference for ChapterTime ID: ${chapterTime._id}`);
            }
        });
        // Populate subjectTimeMap with the data from the database
        subjectTimes.forEach((subjectTime) => {
            const subject = subjectTime.subject_ref;
            if (subject) {
                const subjectName = subject.subject_name;
                subjectTimeMap[subjectName] = {
                    total: subjectTime.total_time,
                    chapters: {},
                };
            }
            else {
                console.warn(`Warning: Missing subject reference for SubjectTime ID: ${subjectTime._id}`);
            }
        });
        // Integrate chapter times into the subject times map
        chapterTimes.forEach((chapterTime) => {
            const chapter = chapterTime.chapter_ref;
            if (chapter && chapter.subject_ref) {
                const chapterName = chapter.chapter_name;
                const subjectName = chapter.subject_ref.subject_name;
                if (subjectName in subjectTimeMap) {
                    subjectTimeMap[subjectName].chapters[chapterName] =
                        chapterTime.time_spent;
                }
            }
        });
        // console.log("subjectTimes", {
        //   subjectTimes,
        //   chapterTimes,
        // });
        // Format the response
        const totalTimePerChapter = Object.entries(chapterTimeMap).map(([name, total]) => ({
            name,
            total: convertTimeToSeconds(total), // Convert to seconds
        }));
        const totalTimePerSubject = Object.entries(subjectTimeMap).map(([name, { total, chapters }]) => ({
            name,
            total: convertTimeToSeconds(total), // Convert to seconds
            chapters: Object.entries(chapters).map(([chapterName, chapterTotal]) => ({
                name: chapterName,
                total: convertTimeToSeconds(chapterTotal), // Convert to seconds
            })),
        }));
        // console.log("totalTimePerChapter", {
        //   totalTimePerSubject,
        //   totalTimePerChapter,
        // });
        res.json({ totalTimePerChapter, totalTimePerSubject });
    }
    catch (error) {
        console.error("Error fetching time per subject and chapter:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
// ***
// Get correct answers by subject and chapter
router.get("/:userId/questions-per-date", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const userObjectId = new mongoose_1.Types.ObjectId(userId);
        // Aggregate quizzes by date to get total questions done
        const quizzesGroupedByDate = yield quizSchema_1.Quiz.aggregate([
            {
                $match: {
                    user_ref: userObjectId,
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    totalQuestionsDone: { $sum: 1 }, // Count the total quizzes (questions done) per date
                },
            },
            {
                $sort: { _id: 1 }, // Sort by date
            },
        ]);
        // Aggregate ResultsByQuestion by date to get total correct answers
        const resultsGroupedByDate = yield resultByQuestionSchema_1.ResultsByQuestion.aggregate([
            {
                $lookup: {
                    from: "resultsbychapters",
                    localField: "results_by_chapter_ref",
                    foreignField: "_id",
                    as: "results_by_chapter",
                },
            },
            {
                $unwind: "$results_by_chapter",
            },
            {
                $lookup: {
                    from: "quizzes",
                    localField: "results_by_chapter.quiz_ref",
                    foreignField: "_id",
                    as: "quiz",
                },
            },
            {
                $unwind: "$quiz",
            },
            {
                $match: {
                    "quiz.user_ref": userObjectId,
                },
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: { format: "%Y-%m-%d", date: "$quiz.date" },
                        },
                    },
                    correctAnswers: { $sum: { $cond: ["$is_correct", 1, 0] } },
                },
            },
            {
                $sort: { "_id.date": 1 }, // Sort by date
            },
        ]);
        // Merge the two datasets by date
        const stats = quizzesGroupedByDate.map((quizGroup) => {
            const resultForDate = resultsGroupedByDate.find((result) => result._id.date === quizGroup._id);
            return {
                date: quizGroup._id,
                questionsDone: quizGroup.totalQuestionsDone, // Total quizzes (questions done) for the date
                correctAnswers: resultForDate ? resultForDate.correctAnswers : 0,
            };
        });
        // Calculate the total questions done and correct answers
        const totalQuestionsDone = stats.reduce((sum, stat) => sum + stat.questionsDone, 0);
        const totalCorrectAnswers = stats.reduce((sum, stat) => sum + stat.correctAnswers, 0);
        res.json({
            totals: {
                questionsDone: totalQuestionsDone,
                correctAnswers: totalCorrectAnswers,
            },
            stats,
        });
    }
    catch (error) {
        console.error("Error fetching questions stats per date:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get the number of answered questions by user
router.get("/:userId/questions-answered", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        // Fetch all quizzes associated with the user
        const quizzes = yield quizSchema_1.Quiz.find({ user_ref: userObjectId }).exec();
        if (!quizzes || quizzes.length === 0) {
            return res
                .status(404)
                .json({ message: "No quizzes found for this user" });
        }
        const quizIds = quizzes.map((quiz) => quiz._id);
        // Fetch ResultsByChapter using the quiz IDs
        const resultsByChapters = yield resultsByChapterSchema_1.ResultsByChapter.find({
            quiz_ref: { $in: quizIds },
        }).exec();
        const chapterIds = resultsByChapters.map((chapter) => chapter.chapter_ref);
        // Fetch available chapters using the chapter IDs
        const availableChapters = yield chapterSchema_1.Chapter.find({
            _id: { $in: chapterIds },
            is_available: true,
        }).exec();
        const availableChapterIds = availableChapters.map((chapter) => chapter._id.toString());
        // Filter resultsByChapters for only available chapters
        const filteredResultsByChapters = resultsByChapters.filter((chapter) => availableChapterIds.includes(chapter.chapter_ref.toString()));
        const resultsByQuestionIds = filteredResultsByChapters.flatMap((chapter) => chapter.results_by_question_ref);
        // Fetch ResultsByQuestion using the filtered ResultsByChapter references
        const resultsByQuestions = yield resultByQuestionSchema_1.ResultsByQuestion.find({
            _id: { $in: resultsByQuestionIds },
        }).exec();
        const questionStats = {
            countCorrect: 0,
            countNotCorrect: 0,
            countCorrectOtherMode: 0,
            countNotCorrectOtherMode: 0,
            detailedResults: [],
        };
        // Group results by question
        const resultsByQuestionMap = new Map();
        const chapterExamModeMap = new Map(); // To track if a chapter has exam mode quiz
        resultsByQuestions.forEach((result) => {
            const resultByChapter = filteredResultsByChapters.find((chapter) => chapter._id.toString() === result.results_by_chapter_ref.toString());
            if (!resultByChapter)
                return;
            const isExamQuiz = quizzes.some((quiz) => quiz.is_exam_mode === true &&
                quiz.results_by_chapter_ref.some((chapterRef) => chapterRef.toString() === resultByChapter._id.toString()));
            const questionId = result.question_ref.toString();
            if (!resultsByQuestionMap.has(questionId)) {
                resultsByQuestionMap.set(questionId, {
                    examResult: null,
                    otherModeResults: [],
                });
            }
            const questionEntry = resultsByQuestionMap.get(questionId);
            // Track whether any quiz in the chapter is an exam mode quiz
            chapterExamModeMap.set(resultByChapter._id.toString(), isExamQuiz);
            // console.log("result", {result});
            // Store results based on mode
            // if (isExamQuiz) {
            questionEntry.examResult = result;
            questionEntry.otherModeResults.push(result);
            // } else {
            // }
        });
        // Process the results and count correct/incorrect answers
        resultsByQuestionMap.forEach((entry, questionId) => {
            const { examResult, otherModeResults } = entry;
            // console.log("otherModeResults", otherModeResults);
            const chapterId = examResult
                ? examResult.results_by_chapter_ref
                : otherModeResults.length > 0
                    ? otherModeResults[0].results_by_chapter_ref
                    : null;
            const hasExamMode = chapterId
                ? chapterExamModeMap.get(chapterId.toString())
                : false;
            if (examResult) {
                if (examResult.is_exam_correct_answers) {
                    questionStats.countCorrect++;
                }
                if (examResult.is_exam_incorrect_answers) {
                    questionStats.countNotCorrect++;
                }
            }
            if (otherModeResults.length > 0) {
                otherModeResults.forEach((result) => {
                    // console.log("Result", {result})
                    if (!hasExamMode) {
                        if (result.is_correct) {
                            // console.log("Update correct count", {result})
                            questionStats.countCorrect++;
                            // questionStats.countCorrectOtherMode++;
                        }
                        if (result.is_not_correct) {
                            // console.log("Update incorrect count", {result})
                            questionStats.countNotCorrect++;
                            // questionStats.countNotCorrectOtherMode++;
                        }
                    }
                    else {
                        if (result.is_correct) {
                            questionStats.countCorrectOtherMode++;
                        }
                        if (result.is_not_correct) {
                            questionStats.countNotCorrectOtherMode++;
                        }
                    }
                });
            }
            // Add the detailed results for this question
            questionStats.detailedResults.push({
                questionId: examResult
                    ? examResult.question_ref
                    : otherModeResults.length > 0
                        ? otherModeResults[0].question_ref
                        : null,
                examResult,
                otherModeResults,
            });
        });
        const questionsAnswered = questionStats.countCorrect +
            questionStats.countNotCorrect +
            questionStats.countCorrectOtherMode +
            questionStats.countNotCorrectOtherMode;
        // Fetch the user to get `total_question_done`
        const user = yield userSchema_1.default.findById(userId).exec();
        // console.log("FINAL", {
        //   countCorrect: questionStats.countCorrect,
        //   countNotCorrect: questionStats.countNotCorrect,
        //   countCorrectOtherMode: questionStats.countCorrectOtherMode,
        //   countNotCorrectOtherMode: questionStats.countNotCorrectOtherMode,
        //   questionsAnswered: user ? user.total_question_done : questionsAnswered,
        // });
        res.status(200).json({
            countCorrect: questionStats.countCorrect,
            countNotCorrect: questionStats.countNotCorrect,
            countCorrectOtherMode: questionStats.countCorrectOtherMode,
            countNotCorrectOtherMode: questionStats.countNotCorrectOtherMode,
            questionsAnswered: user ? user.total_question_done : questionsAnswered,
            detailedResults: questionStats.detailedResults,
        });
    }
    catch (error) {
        console.error("Server error for getting questions-answered:", error);
        res.status(500).json({ message: "Server error", error });
    }
}));
// Reset results in learn
router.post("/:userId/resetResults", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { chapterIds } = req.body;
    try {
        if (!userId || !Array.isArray(chapterIds) || chapterIds.length === 0) {
            return res.status(400).json({
                message: "Invalid input. Provide a valid userId and an array of chapterIds.",
            });
        }
        const userIdObj = new mongoose_1.default.Types.ObjectId(userId);
        const chapterIdObjs = chapterIds.map((id) => new mongoose_1.default.Types.ObjectId(id));
        const quizzes = yield quizSchema_1.Quiz.find({ user_ref: userIdObj }).distinct("_id");
        if (quizzes.length === 0) {
            return res
                .status(404)
                .json({ message: "No quizzes found for the given user." });
        }
        const resultsByChapterIds = yield resultsByChapterSchema_1.ResultsByChapter.find({
            chapter_ref: { $in: chapterIdObjs },
            quiz_ref: { $in: quizzes },
        }).distinct("_id");
        if (resultsByChapterIds.length === 0) {
            return res.status(404).json({
                message: "No results by chapter found for the given chapters and quizzes.",
            });
        }
        yield resultByQuestionSchema_1.ResultsByQuestion.updateMany({
            results_by_chapter_ref: { $in: resultsByChapterIds },
        }, {
            $set: {
                is_correct: false,
                is_not_correct: false,
                is_learn_correct_answers: false,
                is_learn_incorrect_answers: false,
                not_answered_yet: true,
                learn_not_answered_yet: true,
                to_fill_user_answer: "",
                time_spent_per_question: "00:00:00",
                done_by_mode: "",
                answer_by_learn_mode: "",
                date: new Date(),
            },
        });
        yield resultsByChapterSchema_1.ResultsByChapter.updateMany({ _id: { $in: resultsByChapterIds } }, { $set: { questions_done: "0%" } });
        yield resultsByChapterSchema_1.ResultsByChapter.find({
            _id: { $in: resultsByChapterIds },
        });
        res
            .status(200)
            .json({ message: "Results and questions reset successfully" });
    }
    catch (error) {
        console.error("Error resetting results and questions:", error);
        res.status(500).json({ message: "Failed to reset results and questions" });
    }
}));
// Get currecnt results for learn mode
router.get("/:userId/getCurrentResults", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { chapterIds } = req.query;
    try {
        // Validate chapterIds query parameter
        if (!chapterIds || typeof chapterIds !== "string") {
            return res
                .status(400)
                .json({ error: "Invalid chapterIds query parameter" });
        }
        // Convert chapterIds to an array of ObjectId instances
        const chapterIdsArray = chapterIds
            .split(",")
            .map((id) => new mongoose_1.default.Types.ObjectId(id));
        // Fetch ResultsByChapter documents for the given chapter IDs and the specific user
        const resultsByChapters = yield resultsByChapterSchema_1.ResultsByChapter.find({
            chapter_ref: { $in: chapterIdsArray },
            quiz_ref: {
                $in: yield quizSchema_1.Quiz.find({ user_ref: userId }).distinct("_id"),
            },
        }).populate("results_by_question_ref", "question_ref is_correct is_not_correct done_by_mode answer_by_learn_mode is_learn_correct_answers is_learn_incorrect_answers to_fill_user_answer");
        // Fetch the ResultsByQuestion documents for the fetched ResultsByChapter documents
        const results = yield resultByQuestionSchema_1.ResultsByQuestion.find({
            results_by_chapter_ref: {
                $in: resultsByChapters.map((chapter) => chapter._id),
            },
        }).populate("question_ref", "q_latex_content q_latex_explanation q_answertype_options");
        // Fetch the Chapter documents for the given chapter IDs
        const chapters = yield chapterSchema_1.Chapter.find({ _id: { $in: chapterIdsArray } });
        // console.log("Get user results: ", results);
        // Create a map of the results
        const resultMap = results.map((result) => ({
            question_ref: result.question_ref._id,
            q_latex_explanation: result.question_ref.q_latex_explanation,
            is_correct: result.is_correct,
            is_not_correct: result.is_not_correct,
            to_fill_user_answer: result.to_fill_user_answer,
            done_by_mode: result.done_by_mode || "exam",
            answer_by_learn_mode: result.answer_by_learn_mode,
            learn_correct_answers_count: result.is_learn_correct_answers,
            learn_incorrect_answers_count: result.is_learn_incorrect_answers,
        }));
        // Send the response with the results and chapters data
        res.status(200).json({ results: resultMap, chapters });
    }
    catch (error) {
        console.error("Error fetching current results:", error);
        res.status(500).json({ error: error.message });
    }
}));
// Get questions done per subject with percentage for Home Page
router.get("/:userId/questions-done-percentage", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const result = yield userSchema_1.default.aggregate([
            { $match: { _id: new mongoose_1.default.Types.ObjectId(userId) } },
            { $unwind: "$classes_ref" },
            {
                $lookup: {
                    from: "classes",
                    localField: "classes_ref",
                    foreignField: "_id",
                    as: "class",
                },
            },
            { $unwind: "$class" },
            { $unwind: "$class.subjects_ref" },
            {
                $lookup: {
                    from: "subjects",
                    localField: "class.subjects_ref",
                    foreignField: "_id",
                    as: "subject",
                },
            },
            { $unwind: "$subject" },
            { $unwind: "$subject.chapters_ref" },
            {
                $lookup: {
                    from: "chapters",
                    localField: "subject.chapters_ref",
                    foreignField: "_id",
                    as: "chapter",
                },
            },
            { $unwind: "$chapter" },
            { $match: { "chapter.is_available": true } },
            {
                $lookup: {
                    from: "resultsbychapters",
                    let: { chapterId: "$chapter._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$chapter_ref", "$$chapterId"] },
                                        {
                                            $in: [
                                                "$quiz_ref",
                                                yield quizSchema_1.Quiz.find({
                                                    user_ref: new mongoose_1.default.Types.ObjectId(userId),
                                                }).distinct("_id"),
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "resultsByChapter",
                },
            },
            {
                $unwind: {
                    path: "$resultsByChapter",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "resultsbyquestions",
                    localField: "resultsByChapter._id",
                    foreignField: "results_by_chapter_ref",
                    as: "resultsByQuestions",
                },
            },
            {
                $addFields: {
                    correctQuestionsCount: {
                        $size: {
                            $filter: {
                                input: "$resultsByQuestions",
                                as: "result",
                                cond: { $eq: ["$$result.is_correct", true] },
                            },
                        },
                    },
                    incorrectQuestionsCount: {
                        $size: {
                            $filter: {
                                input: "$resultsByQuestions",
                                as: "result",
                                cond: { $eq: ["$$result.is_not_correct", true] },
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    questions_done: {
                        $cond: [
                            { $ne: ["$resultsByChapter.questions_done", null] },
                            {
                                $toDouble: {
                                    $trim: {
                                        input: "$resultsByChapter.questions_done",
                                        chars: "%",
                                    },
                                },
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: {
                        subjectId: "$subject._id",
                        subjectName: "$subject.subject_name",
                    },
                    totalQuestions: { $sum: "$chapter.number_of_questions" },
                    totalQuestionsDone: {
                        $sum: {
                            $multiply: [
                                { $divide: ["$questions_done", 100] },
                                "$chapter.number_of_questions",
                            ],
                        },
                    },
                    totalCorrectQuestions: { $sum: "$correctQuestionsCount" },
                    totalIncorrectQuestions: { $sum: "$incorrectQuestionsCount" },
                    totalChapters: { $sum: 1 },
                    totalDonePercentage: { $sum: "$questions_done" },
                },
            },
            {
                $addFields: {
                    percentageQuestionsDone: {
                        $cond: {
                            if: { $eq: ["$totalChapters", 0] },
                            then: 0,
                            else: {
                                $cond: {
                                    if: { $eq: ["$totalQuestions", 0] },
                                    then: 0,
                                    else: {
                                        $divide: ["$totalDonePercentage", "$totalChapters"],
                                    },
                                },
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    subjectId: "$_id.subjectId",
                    subjectName: "$_id.subjectName",
                    totalQuestions: 1,
                    totalQuestionsDone: 1,
                    totalCorrectQuestions: 1,
                    totalIncorrectQuestions: 1,
                    percentageQuestionsDone: {
                        $round: ["$percentageQuestionsDone", 0],
                    },
                },
            },
        ]);
        res.json(result);
    }
    catch (error) {
        console.error("Error calculating average percentage of questions done by subject:", error);
        res.status(500).json({ message: error.message });
    }
}));
// ** correct-answers-by-subject-and-chapter
router.get("/:userId/correct-answers-by-subject-and-chapter", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        // Fetch user to get total_question_done and university_ref
        const user = yield userSchema_1.default.findById(userObjectId, "total_question_done university_ref").exec();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Fetch quizzes for the user
        const quizzes = yield quizSchema_1.Quiz.find({ user_ref: userObjectId }).lean();
        // Flatten the nested array of results_by_chapter_ref before filtering and querying
        const validResultsByChapterRefs = quizzes
            .flatMap((q) => q.results_by_chapter_ref) // Flatten the array
            .filter((ref) => mongoose_1.default.Types.ObjectId.isValid(ref));
        // Proceed with querying using the valid ObjectIds
        const resultsByChapters = yield resultsByChapterSchema_1.ResultsByChapter.find({
            _id: {
                $in: validResultsByChapterRefs.map((ref) => new mongoose_1.default.Types.ObjectId(ref)),
            },
        }).lean();
        const validResultsByQuestionRefs = resultsByChapters
            .flatMap((rc) => rc.results_by_question_ref) // Flatten again
            .filter((ref) => mongoose_1.default.Types.ObjectId.isValid(ref));
        const resultsByQuestions = yield resultByQuestionSchema_1.ResultsByQuestion.find({
            _id: {
                $in: validResultsByQuestionRefs.map((ref) => new mongoose_1.default.Types.ObjectId(ref)),
            },
        }).lean();
        const chapters = yield chapterSchema_1.Chapter.find({
            _id: { $in: resultsByChapters.map((rc) => rc.chapter_ref) },
            university_ref: user.university_ref, // Ensure university filter
        }).lean();
        const subjects = yield subjectSchema_1.Subject.find({
            university_ref: user.university_ref, // Fetch all subjects regardless of user activity
        }).lean();
        // Fetch user subject progress for each subject
        const subjectProgress = yield userSubjectProgressSchema_1.default.find({
            user_ref: userObjectId,
            subject_ref: { $in: subjects.map((s) => s._id) },
        }).lean();
        // Group data manually
        const groupedData = {};
        resultsByChapters.forEach((resultsByChapter) => {
            const chapter = chapters.find((ch) => ch._id.equals(resultsByChapter.chapter_ref));
            const subject = subjects.find((sub) => sub._id.equals(chapter.subject_ref));
            if (!groupedData[subject._id]) {
                groupedData[subject._id] = {
                    subjectId: subject._id,
                    subjectName: subject.subject_name,
                    chapters: {},
                    totalCorrectAnswerCount: 0,
                    totalAnsweredCount: 0,
                };
            }
            if (!groupedData[subject._id].chapters[chapter._id]) {
                groupedData[subject._id].chapters[chapter._id] = {
                    chapterId: chapter._id,
                    chapterName: chapter.chapter_name,
                    correctAnswerCount: 0,
                    incorrectAnswerCount: 0,
                    totalAnsweredCount: 0,
                };
            }
            resultsByChapter.results_by_question_ref.forEach((questionId) => {
                const question = resultsByQuestions.find((q) => q._id.equals(questionId));
                // Handle the case where is_exam_correct_answers and is_correct are numbers
                let isCorrect;
                if (typeof question.is_exam_correct_answers === "number" &&
                    typeof question.is_correct === "number") {
                    // Both are numbers, sum them
                    isCorrect = question.is_exam_correct_answers + question.is_correct;
                }
                else {
                    // Treat booleans as numbers (true = 1, false = 0) and sum
                    isCorrect =
                        (question.is_exam_correct_answers ? 1 : 0) +
                            (question.is_correct ? 1 : 0);
                }
                const notAnsweredYet = question.exam_not_answered_yet !== false
                    ? question.exam_not_answered_yet
                    : question.not_answered_yet;
                // Update counts based on isCorrect value
                if (isCorrect > 0) {
                    groupedData[subject._id].chapters[chapter._id].correctAnswerCount +=
                        isCorrect;
                    groupedData[subject._id].totalCorrectAnswerCount += isCorrect;
                }
                if (notAnsweredYet === false) {
                    groupedData[subject._id].chapters[chapter._id].totalAnsweredCount++;
                    groupedData[subject._id].totalAnsweredCount++;
                    if (isCorrect === 0) {
                        groupedData[subject._id].chapters[chapter._id]
                            .incorrectAnswerCount++;
                    }
                }
            });
        });
        // Fetch all chapters for the user's university
        const allChapters = yield chapterSchema_1.Chapter.find({
            university_ref: user.university_ref,
        }).lean();
        // Fetch user chapter progress to get total questions done by chapter
        const chapterProgress = yield userChapterProgressSchema_1.default.find({
            user_ref: userObjectId,
        }).lean();
        // Combine grouped data with all subjects to ensure every subject is included
        const finalResult = subjects.map((subject) => {
            const subjectData = groupedData[subject._id] || {
                subjectId: subject._id,
                subjectName: subject.subject_name,
                chapters: {},
                totalCorrectAnswerCount: 0,
                totalAnsweredCount: 0,
            };
            // Ensure all chapters are included, even if no progress has been made
            const subjectChapters = allChapters
                .filter((ch) => ch.subject_ref.equals(subject._id))
                .map((chapter) => {
                const chapterData = subjectData.chapters[chapter._id] || {
                    chapterId: chapter._id,
                    chapterName: chapter.chapter_name,
                    correctAnswerCount: 0,
                    incorrectAnswerCount: 0,
                    totalAnsweredCount: 0,
                };
                // Find all progress entries for the chapter (different modes)
                const progressForChapter = chapterProgress.filter((cp) => cp.chapter_ref.equals(chapter._id));
                // Sum the total_questions_done for this chapter across all modes
                const totalQuestionsDone = progressForChapter.reduce((sum, cp) => sum + (cp.total_questions_done || 0), 0);
                return Object.assign(Object.assign({}, chapterData), { totalQuestionsDone: totalQuestionsDone });
            });
            // Find the user's total_questions_done for this subject
            const subjectProgressForUser = subjectProgress.find((sp) => sp.subject_ref.equals(subject._id));
            // console.log("subjectProgressForUser", {subjectProgressForUser})
            const totalQuestionsDoneForSubject = (subjectProgressForUser === null || subjectProgressForUser === void 0 ? void 0 : subjectProgressForUser.total_questions_done) || 0;
            // console.log(
            //   "totalQuestionsDoneForSubject",
            //   totalQuestionsDoneForSubject
            // );
            return {
                subjectId: subjectData.subjectId,
                subjectName: subjectData.subjectName,
                totalCorrectAnswerCount: subjectData.totalCorrectAnswerCount,
                totalAnsweredCount: subjectData.totalAnsweredCount,
                totalQuestionsDone: totalQuestionsDoneForSubject, // Include the total questions done for the subject
                chapters: subjectChapters,
            };
        });
        res.status(200).json({
            total_question_done: user.total_question_done,
            subjects: finalResult,
        });
    }
    catch (error) {
        console.error("Server error while getting the correct answer by subject and chapter:", error);
        res.status(500).json({ message: "Server Error" });
    }
}));
// Get questions done by chapter
router.get("/questions-by-chapter/:userId/:chapterId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, chapterId } = req.params;
    try {
        // Find the quiz related to the user and chapter
        const userQuizzes = yield quizSchema_1.Quiz.find({ user_ref: userId }).distinct("_id");
        // Find the results by chapter related to the user's quizzes
        const resultsByChapter = yield resultsByChapterSchema_1.ResultsByChapter.findOne({
            chapter_ref: chapterId,
            quiz_ref: { $in: userQuizzes },
        }).exec();
        let questionsDone = "0%";
        if (resultsByChapter) {
            questionsDone = resultsByChapter.questions_done;
        }
        res.json({ questions_done: questionsDone });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
router.get("/:userId/exam-results/:chapterIds", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, chapterIds } = req.params;
    const chapterIdArray = chapterIds
        .split(",")
        .map((id) => new mongoose_1.default.Types.ObjectId(id));
    console.log("req.params", req.params, chapterIdArray);
    try {
        // Fetch quizzes that match the user and the chapters
        const quizzes = yield quizSchema_1.Quiz.find({
            user_ref: new mongoose_1.default.Types.ObjectId(userId),
            is_exam_mode: true,
            chapters_ref: { $in: chapterIdArray }, // Query for chapters that exist in the chapters_ref array
        })
            .populate({
            path: "results_by_chapter_ref",
            populate: {
                path: "results_by_question_ref",
                populate: {
                    path: "question_ref",
                    select: "q_answertype_options q_answertype_options_has_multiple_good_answers q_latex_explanation q_latex_explanation_ChatGPT q_image_url q_latex_content q_answertype_tofill",
                },
            },
        })
            .populate({
            path: "chapters_ref",
            populate: {
                path: "subject_ref",
            },
        });
        console.log("Fetched quizzes:", quizzes);
        // Step 2: Create a subjects map to store structured data
        const subjectsMap = {};
        quizzes.forEach((quiz) => {
            quiz.chapters_ref.forEach((chapter) => {
                const subjectId = chapter.subject_ref._id.toString();
                const chapterId = chapter._id.toString();
                // Initialize subject if not already present in the map
                if (!subjectsMap[subjectId]) {
                    subjectsMap[subjectId] = {
                        id: subjectId,
                        name: chapter.subject_ref.subject_name,
                        chapters: {},
                    };
                }
                // Initialize chapter if not already present under this subject
                if (!subjectsMap[subjectId].chapters[chapterId]) {
                    subjectsMap[subjectId].chapters[chapterId] = {
                        id: chapterId,
                        name: chapter.chapter_name,
                        results: [],
                    };
                }
                // Add results by question to the chapter
                quiz.results_by_chapter_ref.forEach((resultsByChapter) => {
                    if (resultsByChapter.chapter_ref.toString() === chapterId) {
                        resultsByChapter.results_by_question_ref.forEach((result) => {
                            const question = result.question_ref;
                            // Filter out options with empty latex_content and image_url
                            const filteredOptions = question.q_answertype_options.filter((option) => option.latex_content || option.image_url);
                            subjectsMap[subjectId].chapters[chapterId].results.push({
                                question_id: question._id,
                                chapterId: chapterId,
                                result_id: result._id,
                                is_correct: result.is_exam_correct_answers,
                                is_not_correct: result.is_exam_incorrect_answers,
                                to_fill_user_answer: result.exam_fill_user_answer,
                                not_answered_yet: result.not_answered_yet,
                                q_answertype_options: filteredOptions,
                                q_answertype_options_has_multiple_good_answers: question.q_answertype_options_has_multiple_good_answers,
                                q_latex_explanation: question.q_latex_explanation,
                                q_latex_explanation_ChatGPT: question.q_latex_explanation_ChatGPT,
                                q_image_url: question.q_image_url,
                                q_latex_content: question.q_latex_content,
                                q_answertype_tofill: question.q_answertype_tofill,
                            });
                        });
                    }
                });
            });
        });
        // Step 3: Transform subjectsMap into an array
        const subjectsArray = Object.values(subjectsMap).map((subject) => (Object.assign(Object.assign({}, subject), { chapters: Object.values(subject.chapters) })));
        // Send the response
        res.status(200).json(subjectsArray);
    }
    catch (error) {
        console.error("Error fetching exam results:", error);
        res.status(500).json({ message: "Failed to fetch exam results" });
    }
}));
router.put("/:resultId/update-exam-results", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { resultId } = req.params;
    const { is_exam_correct_answers, is_exam_incorrect_answers } = req.body;
    try {
        // Find the result by ID
        const result = yield resultByQuestionSchema_1.ResultsByQuestion.findById(resultId);
        if (!result) {
            return res.status(404).json({ message: "Result not found" });
        }
        // Update fields if they are provided in the request body
        if (typeof is_exam_correct_answers === "boolean") {
            result.is_exam_correct_answers = is_exam_correct_answers;
        }
        if (typeof is_exam_incorrect_answers === "boolean") {
            result.is_exam_incorrect_answers = is_exam_incorrect_answers;
        }
        // Save the updated result
        yield result.save();
        res.status(200).json({ message: "Result updated successfully", result });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
router.post("/increment-questions", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id, mode } = req.body;
    if (!user_id || !mode) {
        return res.status(400).json({ message: "user_id and mode are required." });
    }
    try {
        // Get the current date (without time part)
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        yesterday.setUTCHours(0, 0, 0, 0); // Normalize the date to avoid time zone issues
        // Check if there is already a record for this user, mode, and today's date
        let totalQuestionRecord = yield totalQuestionDoneScheme_1.default.findOne({
            user_ref: user_id,
            mode: mode,
            date: yesterday, // Match the date exactly (only track today's record)
        });
        // If no document exists for today, create a new one
        if (!totalQuestionRecord) {
            totalQuestionRecord = new totalQuestionDoneScheme_1.default({
                user_ref: user_id,
                mode: mode,
                date: yesterday, // Store today's date
                total_questions_done: 1, // Initialize with 1 since it's the first time for today
            });
        }
        else {
            // If document exists for today, increment the total_questions_done
            totalQuestionRecord.total_questions_done += 1;
        }
        // Save the updated document
        yield totalQuestionRecord.save();
        return res.status(200).json({
            message: "Total questions done incremented for today.",
            total_questions_done: totalQuestionRecord.total_questions_done,
        });
    }
    catch (error) {
        console.error("Error incrementing total questions:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}));
router.get("/increment-questions/correct/get/:user_id/:chapter_id/:mode", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id, chapter_id, mode } = req.params;
    try {
        const result = yield totoalCorrectQuestions_1.default.findOne({
            user_ref: user_id,
            mode: mode,
            chapter_ref: chapter_id,
        });
        if (result) {
            return res.status(200).json({
                message: "Total questions done updated for today.",
                result,
            });
        }
        else {
            return res.status(200).json({
                message: "No result found",
                result: [],
            });
        }
    }
    catch (error) {
        console.error("Error getting total correct questions:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}));
// router.post(
//   "/increment-questions/correct",
//   async (req: Request, res: Response) => {
//     const { user_id, mode, correct_answers_count, chapter_id } = req.body;
//     if (
//       !user_id ||
//       !mode ||
//       !chapter_id ||
//       correct_answers_count === undefined
//     ) {
//       return res.status(400).json({
//         message:
//           "user_id, mode, chapter_id, and correct_answers_count are required.",
//       });
//     }
//     try {
//       // Get today's date (without the time part)
//       const today = new Date();
//       today.setUTCHours(0, 0, 0, 0); // Normalize date to avoid timezone issues
//       // Check if there's already a record for this user, mode, and chapter for today's date
//       let totalQuestionRecord = await TotalCorrectQuestions.findOne({
//         user_ref: user_id,
//         mode: mode,
//         chapter_ref: chapter_id,
//         date: today, // Match exactly today's date
//       });
//       console.log("totalQuestionRecord", {
//         totalQuestionRecord,
//         body: req.body,
//       });
//       // If no document exists for today, create a new one
//       if (!totalQuestionRecord) {
//         totalQuestionRecord = new TotalCorrectQuestions({
//           user_ref: user_id,
//           mode: mode,
//           chapter_ref: chapter_id,
//           date: today, // Store today's date
//           counts: correct_answers_count, // Initialize with the correct answers from the new attempt
//         });
//       } else {
//         // If document exists, update the counts with the new attempt
//         totalQuestionRecord.counts = correct_answers_count;
//       }
//       // Save the updated document
//       await totalQuestionRecord.save();
//       return res.status(200).json({
//         message: "Total questions done updated for today.",
//         counts: totalQuestionRecord.counts,
//       });
//     } catch (error) {
//       console.error("Error updating total correct questions:", error);
//       return res.status(500).json({ message: "Internal server error." });
//     }
//   }
// );
router.post("/increment-questions/correct", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id, mode, correct_answers_count, chapter_id, question_id } = req.body;
    if (!user_id ||
        !mode ||
        !chapter_id ||
        correct_answers_count === undefined) {
        return res.status(400).json({
            message: "user_id, mode, chapter_id, and correct_answers_count are required.",
        });
    }
    try {
        // Get today's date (without the time part)
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Normalize date to avoid timezone issues
        // Check if there's already a record for this user, mode, and chapter for today's date
        let totalQuestionRecord = yield totoalCorrectQuestions_1.default.findOne({
            user_ref: user_id,
            mode: mode,
            chapter_ref: chapter_id,
            date: today, // Match exactly today's date
        });
        // If no document exists for today, create a new one
        if (!totalQuestionRecord) {
            totalQuestionRecord = new totoalCorrectQuestions_1.default({
                user_ref: user_id,
                mode: mode,
                chapter_ref: chapter_id,
                date: today, // Store today's date
                counts: correct_answers_count, // Initialize with the correct answers from the new attempt
                correct_questions: mode === "random" ? [question_id] : [], // Track questions only in random mode
            });
        }
        else {
            // For random mode, ensure the question is not counted twice
            if (mode === "random") {
                if (!totalQuestionRecord.correct_questions.includes(question_id)) {
                    totalQuestionRecord.counts += correct_answers_count;
                    totalQuestionRecord.correct_questions.push(question_id); // Track that this question was answered correctly
                }
            }
            else {
                // For other modes, just update the counts directly
                totalQuestionRecord.counts = correct_answers_count;
            }
        }
        // Save the updated document
        yield totalQuestionRecord.save();
        return res.status(200).json({
            message: "Total questions done updated for today.",
            counts: totalQuestionRecord.counts,
        });
    }
    catch (error) {
        console.error("Error updating total correct questions:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}));
router.post("/correct-count/reset", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, chapterIds, mode } = req.body;
    console.log("BODY", req.body);
    // Check if userId and chapterIds are provided and are in the correct format
    if (!userId || !chapterIds || !Array.isArray(chapterIds)) {
        return res.status(400).json({
            message: "User ID and chapter IDs are required and should be an array.",
        });
    }
    try {
        // Convert userId to ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID format." });
        }
        const objectIdUserId = new mongoose_1.default.Types.ObjectId(userId);
        // Initialize a count of modified chapters
        let totalModified = 0;
        // Loop through each chapterId and reset the corresponding records
        for (const chapterId of chapterIds) {
            // Validate each chapterId before converting to ObjectId
            if (!mongoose_1.default.Types.ObjectId.isValid(chapterId)) {
                return res
                    .status(400)
                    .json({ message: `Invalid chapter ID format: ${chapterId}` });
            }
            const objectIdChapterId = new mongoose_1.default.Types.ObjectId(chapterId);
            // Update the TotalCorrectQuestions collection for each chapter
            const result = yield totoalCorrectQuestions_1.default.updateOne({
                user_ref: objectIdUserId, // Use ObjectId for user_ref
                chapter_ref: objectIdChapterId, // Use ObjectId for chapter_ref
                mode: mode,
            }, {
                $set: { counts: 0, correct_questions: [] }, // Reset counts to 0 and clear correct_questions array
            });
            totalModified += 0;
        }
        return res.status(200).json({
            message: "Correct counts reset successfully for all chapters",
            totalModified,
        });
    }
    catch (error) {
        console.error("Error resetting correct counts:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}));
exports.default = router;
