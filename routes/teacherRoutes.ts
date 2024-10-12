import express, { Request, Response } from "express";
import { IQuiz, Quiz } from "../schemas/quizSchema";
import { Class } from "../schemas/classSchema";
import { IUser } from "../schemas/userSchema";
import User from "../schemas/userSchema";
import mongoose, { Types } from "mongoose";
import { Subject } from "../schemas/subjectSchema";
import { Course } from "../schemas/courseSchema";
import { Chapter } from "../schemas/chapterSchema";
import UserSubjectProgress from "../schemas/userSubjectProgressSchema";
import { ResultsByQuestion } from "../schemas/resultByQuestionSchema";
import { ResultsByChapter } from "../schemas/resultsByChapterSchema";
import { SubjectTime } from "../schemas/timeTracker";
import UserChapterProgress from "../schemas/userChapterProgressSchema";
import Question from "../schemas/questionSchema";

const router = express.Router();

// PER COURSE ---------------------------------------------
// Get average time for users in a specific course
router.get(
  "/average-time/course/:courseId",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      // Fetch the course to get the classes
      const course = await Course.findById(courseObjectId)
        .populate("classes_ref")
        .exec();
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      let totalQuizTime = 0;
      let totalQuizzes = 0;

      for (const classObj of course.classes_ref as any) {
        // Fetch the subjects for the class
        const subjects = await Subject.find({ class_ref: classObj._id }).exec();
        for (const subject of subjects) {
          // Fetch and combine all subject times
          const subjectTimes = await SubjectTime.find({
            subject_ref: subject._id,
          }).exec();

          console.log("subjectTimes", subjectTimes);

          let combinedSubjectTimeInSeconds = 0;

          for (const subjectTime of subjectTimes) {
            const [hours, minutes, seconds] = subjectTime.total_time
              .split(":")
              .map(Number);
            combinedSubjectTimeInSeconds +=
              hours * 3600 + minutes * 60 + seconds;
          }

          totalQuizTime += combinedSubjectTimeInSeconds;
          totalQuizzes++;
        }
      }

      const averageTimeInSeconds =
        totalQuizzes > 0 ? totalQuizTime / totalQuizzes : 0;
      const averageTimeFormatted = new Date(averageTimeInSeconds * 1000)
        .toISOString()
        .substr(11, 8);

      res.json({ averageTimeFormatted });
    } catch (error) {
      console.error(
        "Error fetching course and calculating average time:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per course
router.get(
  "/average-grade/course/:courseId",
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      // Fetch the course to get the classes
      const course = await Course.findById(courseObjectId)
        .populate("classes_ref")
        .exec();
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      let totalCorrect = 0;
      let totalQuestionsDone = 0;
      const resultsByChapterRefs = new Set<mongoose.Types.ObjectId>();

      for (const classObj of course.classes_ref as any) {
        // Fetch the subjects for the class
        const subjects = await Subject.find({ class_ref: classObj._id }).exec();
        for (const subject of subjects) {
          // Fetch quizzes for each chapter
          const quizzes = await Quiz.find({
            chapters_ref: { $in: subject.chapters_ref },
          }).exec();
          for (const quiz of quizzes) {
            // Collect unique results_by_chapter_ref
            quiz.results_by_chapter_ref.forEach((ref: any) =>
              resultsByChapterRefs.add(ref)
            );
          }

          // Fetch total questions done from UserSubjectProgress
          const userSubjectProgresses = await UserSubjectProgress.find({
            subject_ref: subject._id,
          }).exec();
          for (const progress of userSubjectProgresses) {
            totalQuestionsDone += progress.total_questions_done;
          }
        }
      }

      // Fetch results by question only once
      const resultsByQuestions = await ResultsByQuestion.find({
        results_by_chapter_ref: { $in: Array.from(resultsByChapterRefs) },
        is_correct: true,
      }).exec();
      totalCorrect = resultsByQuestions.length;

      // Calculate average grade
      const averageGrade = totalQuestionsDone
        ? ((totalCorrect / totalQuestionsDone) * 100).toFixed(2) + "%"
        : "0%";

      res.json({
        averageGrade,
        courseId,
        totalCorrect,
        totalQuestionsDone,
      });
    } catch (error) {
      console.error(
        "Error fetching course and calculating average grade:",
        error
      );
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// Get average grade, correct answers count per subject and chapter for a course
router.get("/course/:courseId/grades", async (req: Request, res: Response) => {
  const { courseId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid courseId format" });
    }
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    // Step 1: Retrieve the classes and their associated subjects
    const classes = await Class.find({ course_ref: courseObjectId }).populate({
      path: "subjects_ref",
      populate: {
        path: "chapters_ref",
      },
    });

    // Initialize result object
    const subjects: any = {};

    // Step 2: Calculate chapter-level results
    for (const classItem of classes) {
      for (const subject of classItem.subjects_ref as any) {
        for (const chapter of subject.chapters_ref as any) {
          // Retrieve results for this chapter
          const resultsByChapter = await ResultsByChapter.find({
            chapter_ref: chapter._id,
          }).populate("results_by_question_ref");

          const chapterResult = {
            correctAnswers: 0,
            incorrectAnswers: 0,
            notAnsweredYet: 0,
            totalQuestionsDone: 0,
            chapterName: chapter.chapter_name,
            chapterId: chapter._id,
          };

          for (const result of resultsByChapter as any) {
            for (const question of result.results_by_question_ref as any) {
              if (question.is_correct) chapterResult.correctAnswers++;
              if (question.is_not_correct) chapterResult.incorrectAnswers++;
              if (question.not_answered_yet) chapterResult.notAnsweredYet++;
            }

            chapterResult.totalQuestionsDone +=
              chapterResult.correctAnswers + chapterResult.incorrectAnswers;
          }

          // Initialize the subject if not already
          if (!subjects[subject._id]) {
            subjects[subject._id] = {
              subjectName: subject.subject_name,
              subjectId: subject._id,
              chapters: [],
              totalCorrect: 0,
              totalIncorrect: 0,
              totalNotAnsweredYet: 0,
              totalQuestions: 0,
            };
          }

          // Accumulate chapter results into subject
          subjects[subject._id].chapters.push(chapterResult);
          subjects[subject._id].totalCorrect += chapterResult.correctAnswers;
          subjects[subject._id].totalIncorrect +=
            chapterResult.incorrectAnswers;
          subjects[subject._id].totalNotAnsweredYet +=
            chapterResult.notAnsweredYet;
          subjects[subject._id].totalQuestions +=
            chapterResult.totalQuestionsDone;
        }
      }
    }

    // Step 3: Retrieve and sum totalQuestionsDone for each subject
    for (const subjectId of Object.keys(subjects)) {
      const userProgress = await UserSubjectProgress.aggregate([
        { $match: { subject_ref: new mongoose.Types.ObjectId(subjectId) } },
        {
          $group: {
            _id: null,
            totalQuestionsDoneSum: { $sum: "$total_questions_done" },
          },
        },
      ]);

      subjects[subjectId].totalQuestionsDoneSum =
        userProgress.length > 0 ? userProgress[0].totalQuestionsDoneSum : 0;

      // Calculate overall average grade for the subject
      const subject = subjects[subjectId];
      console.log("SUM", subject.totalQuestionsDoneSum);
      subject.overallAverageGrade =
        subject.totalQuestionsDoneSum > 0
          ? `${Math.round(
              ((subject.totalCorrect + subject.totalIncorrect) /
                subject.totalQuestionsDoneSum) *
                100
            )}%`
          : "0";
    }

    // Convert the subjects object to an array for the response
    const resultArray = Object.values(subjects);

    // Step 4: Send response
    res.json({ subjects: resultArray });
  } catch (error) {
    console.error("Error fetching quiz grades:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get questions done per date for a course
router.get(
  "/course/:courseId/questions-done-per-date",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      const results = await Class.aggregate([
        { $match: { course_ref: courseObjectId } },
        { $unwind: "$subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        { $unwind: "$resultsByChapter.results_by_question_ref" },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $group: {
            _id: {
              subjectId: "$subject._id",
              subjectName: "$subject.subject_name",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.createdAt",
                },
              },
            },
            uniqueQuestions: { $addToSet: "$resultsByQuestion._id" },
          },
        },
        {
          $project: {
            _id: 0,
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            date: "$_id.date",
            totalQuestions: { $size: "$uniqueQuestions" },
          },
        },
        {
          $group: {
            _id: {
              subjectId: "$subjectId",
              subjectName: "$subjectName",
            },
            questionsPerDate: {
              $push: {
                date: "$date",
                totalQuestions: "$totalQuestions",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            questionsPerDate: 1,
          },
        },
        { $sort: { subjectName: 1, "questionsPerDate.date": 1 } },
      ]);

      res.json({ subjects: results });
    } catch (error) {
      console.error(
        "Error fetching total questions per date per subject:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per mode for a course
router.get(
  "/course/:courseId/average-grade-per-mode",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      // Step 1: Retrieve the course and its classes
      const course = await Course.findById(courseObjectId).populate({
        path: "classes_ref",
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const gradesPerMode: any = {};

      // Step 2: Process each class
      for (const classItem of course.classes_ref as any[]) {
        // Populate subjects for each class
        await classItem.populate("subjects_ref");

        for (const subject of classItem.subjects_ref as any[]) {
          // Populate chapters for each subject
          await subject.populate("chapters_ref");

          for (const chapter of subject.chapters_ref as any[]) {
            // Step 3: Retrieve results by chapter and group by question mode
            const resultsByChapter = await ResultsByChapter.find({
              chapter_ref: chapter._id,
            }).populate("results_by_question_ref");

            const modeResults: any = {};

            for (const result of resultsByChapter as any[]) {
              for (const question of result.results_by_question_ref as any[]) {
                const mode = question.done_by_mode;

                if (!modeResults[mode]) {
                  modeResults[mode] = {
                    totalCorrect: 0,
                    totalIncorrect: 0,
                    totalNotAnsweredYet: 0,
                  };
                }

                if (question.is_correct) modeResults[mode].totalCorrect++;
                if (question.is_not_correct) modeResults[mode].totalIncorrect++;
                if (question.not_answered_yet)
                  modeResults[mode].totalNotAnsweredYet++;
              }
            }

            // Step 4: Retrieve and sum totalQuestionsDone from UserChapterProgress for each mode
            for (const mode of Object.keys(modeResults)) {
              const chapterProgress = await UserChapterProgress.aggregate([
                {
                  $match: {
                    chapter_ref: chapter._id,
                    mode: mode,
                  },
                },
                {
                  $group: {
                    _id: null,
                    totalQuestionsDone: { $sum: "$total_questions_done" },
                  },
                },
              ]);

              const totalQuestionsDone =
                chapterProgress.length > 0
                  ? chapterProgress[0].totalQuestionsDone
                  : 0;

              if (!gradesPerMode[mode]) {
                gradesPerMode[mode] = {
                  totalCorrect: 0,
                  totalIncorrect: 0,
                  totalNotAnsweredYet: 0,
                  totalQuestionsDone: 0,
                };
              }

              gradesPerMode[mode].totalCorrect +=
                modeResults[mode].totalCorrect;
              gradesPerMode[mode].totalIncorrect +=
                modeResults[mode].totalIncorrect;
              gradesPerMode[mode].totalNotAnsweredYet +=
                modeResults[mode].totalNotAnsweredYet;
              gradesPerMode[mode].totalQuestionsDone += totalQuestionsDone;
            }
          }
        }
      }

      // Step 5: Calculate the average grade for each mode
      const results = Object.keys(gradesPerMode).map((mode) => {
        const totalCorrect = gradesPerMode[mode].totalCorrect;
        const totalIncorrect = gradesPerMode[mode].totalIncorrect;
        const totalQuestionsDone = gradesPerMode[mode].totalQuestionsDone;

        const averageGrade =
          totalQuestionsDone > 0
            ? `${Math.round(
                ((totalCorrect + totalIncorrect) / totalQuestionsDone) * 100
              )}%`
            : "N/A";

        return {
          courseId: courseObjectId,
          courseName: course.course_name,
          doneByMode: mode,
          totalCorrect,
          totalIncorrect,
          totalNotAnsweredYet: gradesPerMode[mode].totalNotAnsweredYet,
          totalQuestionsDone,
          averageGrade,
        };
      });

      // Sort the results by mode and send the response
      results.sort((a, b) => a.doneByMode.localeCompare(b.doneByMode));
      res.json({ courseId: courseObjectId, grades: results });
    } catch (error) {
      console.error("Error fetching average grade by mode for course:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per exam mode for a course
router.get(
  "/course/:courseId/average-grade-per-exam-mode",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      const results = await Course.aggregate([
        { $match: { _id: courseObjectId } },
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $match: {
            "resultsByQuestion.done_by_mode": "exam",
          },
        },
        {
          $group: {
            _id: {
              subjectId: "$subject._id",
              subjectName: "$subject.subject_name",
              doneByMode: "$resultsByQuestion.done_by_mode",
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalNotAnsweredYet: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.not_answered_yet", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: {
              subjectId: "$_id.subjectId",
              subjectName: "$_id.subjectName",
              doneByMode: "$_id.doneByMode",
            },
            totalCorrect: { $sum: "$totalCorrect" },
            totalIncorrect: { $sum: "$totalIncorrect" },
            totalNotAnsweredYet: { $sum: "$totalNotAnsweredYet" },
            totalQuestions: { $sum: "$totalQuestions" },
            averageGrade: {
              $avg: {
                $multiply: [
                  { $divide: ["$totalCorrect", "$totalQuestions"] },
                  100,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            doneByMode: "$_id.doneByMode",
            averageGrade: {
              $concat: [{ $toString: { $round: ["$averageGrade", 2] } }, "%"],
            },
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalNotAnsweredYet: "$totalNotAnsweredYet",
            totalQuestions: "$totalQuestions",
          },
        },
        { $sort: { subjectName: 1, doneByMode: 1 } },
      ]);

      res.json({ courseId: courseObjectId, grades: results });
    } catch (error) {
      console.error(
        "Error fetching average grade per exam mode for subjects:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per date per exam mode for a course
router.get(
  "/course/:courseId/average-grade-per-date-per-exam-mode",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      const results = await Course.aggregate([
        { $match: { _id: courseObjectId } },
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $match: {
            "resultsByQuestion.done_by_mode": "exam",
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalNotAnsweredYet: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.not_answered_yet", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            averageGrade: {
              $cond: [
                { $gt: ["$totalQuestions", 0] },
                {
                  $concat: [
                    {
                      $toString: {
                        $round: [
                          {
                            $multiply: [
                              { $divide: ["$totalCorrect", "$totalQuestions"] },
                              100,
                            ],
                          },
                          2,
                        ],
                      },
                    },
                    "%",
                  ],
                },
                "N/A",
              ],
            },
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalNotAnsweredYet: "$totalNotAnsweredYet",
            totalQuestions: "$totalQuestions",
          },
        },
        { $sort: { date: 1 } },
      ]);

      res.json({ courseId: courseObjectId, gradesPerDate: results });
    } catch (error) {
      console.error("Error fetching average grade per date for course:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get time spent per mode for a course
router.get(
  "/course/:courseId/time-spent-per-mode",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      const results = await Course.aggregate([
        { $match: { _id: courseObjectId } },
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: {
              courseId: "$class._id",
              courseName: "$class.class_name",
              subjectId: "$subject._id",
              subjectName: "$subject.subject_name",
              doneByMode: "$quizzes.quiz_mode",
            },
            totalTimeSpentSeconds: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      {
                        $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 3600],
                      },
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 1] }, 60] },
                      { $arrayElemAt: ["$$timeParts", 2] },
                    ],
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
            doneByMode: "$_id.doneByMode",
            totalTimeSpent: {
              $concat: [
                {
                  $toString: {
                    $floor: { $divide: ["$totalTimeSpentSeconds", 60] },
                  },
                },
                "m ",
                { $toString: { $mod: ["$totalTimeSpentSeconds", 60] } },
                "s",
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              courseId: courseObjectId,
            },
            timeSpentBySubject: {
              $push: {
                subjectId: "$subjectId",
                subjectName: "$subjectName",
                doneByMode: "$doneByMode",
                totalTimeSpent: "$totalTimeSpent",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            courseId: "$_id.courseId",
            timeSpentBySubject: "$timeSpentBySubject",
          },
        },
      ]);
      const timeSpentBySubjectMap = new Map<string, any>();
      results[0]?.timeSpentBySubject.forEach(
        (item: {
          subjectId: any;
          doneByMode: any;
          subjectName: any;
          totalTimeSpent: string;
        }) => {
          const key = `${item.subjectId}_${item.doneByMode}`;
          if (!timeSpentBySubjectMap.has(key)) {
            timeSpentBySubjectMap.set(key, {
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              doneByMode: item.doneByMode,
              totalTimeSpent: item.totalTimeSpent,
            });
          } else {
            const existing = timeSpentBySubjectMap.get(key);
            const [existingMinutes, existingSeconds] = existing.totalTimeSpent
              .split("m ")
              .map((t: string) => t.replace("s", ""));
            const existingTotalSeconds =
              parseInt(existingMinutes) * 60 + parseInt(existingSeconds);
            const [currentMinutes, currentSeconds] = item.totalTimeSpent
              .split("m ")
              .map((t) => t.replace("s", ""));
            const currentTotalSeconds =
              parseInt(currentMinutes) * 60 + parseInt(currentSeconds);
            const newTotalSeconds = existingTotalSeconds + currentTotalSeconds;
            const minutes = Math.floor(newTotalSeconds / 60);
            const seconds = newTotalSeconds % 60;
            existing.totalTimeSpent = `${minutes}m ${seconds}s`;
          }
        }
      );
      const processedResults = Array.from(timeSpentBySubjectMap.values());
      res.json({
        courseId: courseObjectId,
        timeSpentBySubject: processedResults,
      });
    } catch (error) {
      console.error("Error fetching time spent per mode for course:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get percentage time spent per mode for a course
router.get(
  "/course/:courseId/time-spent-per-mode-percentage",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);
      const results = await Course.aggregate([
        { $match: { _id: courseObjectId } },
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: "$quizzes.quiz_mode",
            totalTimeSpentSeconds: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      {
                        $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 3600],
                      },
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 1] }, 60] },
                      { $arrayElemAt: ["$$timeParts", 2] },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalTimeSpent: { $sum: "$totalTimeSpentSeconds" },
            modes: {
              $push: {
                doneByMode: "$_id",
                totalTimeSpentSeconds: "$totalTimeSpentSeconds",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            courseId: courseObjectId,
            totalTimeSpent: {
              $concat: [
                {
                  $toString: { $floor: { $divide: ["$totalTimeSpent", 3600] } },
                },
                "h ",
                {
                  $toString: {
                    $floor: {
                      $divide: [{ $mod: ["$totalTimeSpent", 3600] }, 60],
                    },
                  },
                },
                "m ",
                { $toString: { $mod: ["$totalTimeSpent", 60] } },
                "s",
              ],
            },
            timeSpentByMode: {
              $map: {
                input: "$modes",
                as: "mode",
                in: {
                  doneByMode: "$$mode.doneByMode",
                  totalTimeSpentPercentage: {
                    $concat: [
                      {
                        $toString: {
                          $round: [
                            {
                              $multiply: [
                                {
                                  $divide: [
                                    "$$mode.totalTimeSpentSeconds",
                                    "$totalTimeSpent",
                                  ],
                                },
                                100,
                              ],
                            },
                            2,
                          ],
                        },
                      },
                      "%",
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            courseId: 1,
            totalTimeSpent: 1,
            timeSpentByMode: 1,
          },
        },
      ]);

      res.json({
        courseId: courseObjectId,
        totalTimeSpent: results[0]?.totalTimeSpent || "0h 0m 0s",
        timeSpentByMode: results[0]?.timeSpentByMode || [],
      });
    } catch (error) {
      console.error(
        "Error fetching time spent per mode percentage for course:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get time spent per date for a course
router.get(
  "/course/:courseId/time-spent-per-date",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      const results = await Course.aggregate([
        { $match: { _id: courseObjectId } },
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$quizzes.date" },
              },
              courseId: courseObjectId,
              courseName: "$course_name",
            },
            totalTimeSpentMinutes: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 60] },
                      {
                        $add: [
                          { $arrayElemAt: ["$$timeParts", 1] },
                          {
                            $divide: [{ $arrayElemAt: ["$$timeParts", 0] }, 60],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            totalTimeSpent: {
              $concat: [{ $toString: "$totalTimeSpentMinutes" }, "m"],
            },
          },
        },
        {
          $sort: {
            date: 1,
          },
        },
      ]);
      const totalTimeSpent = results.reduce(
        (acc, curr) => acc + parseFloat(curr.totalTimeSpent),
        0
      );
      const timeSpentByDate = results.map((item) => ({
        ...item,
        totalTimeSpentPercentage:
          ((parseFloat(item.totalTimeSpent) / totalTimeSpent) * 100).toFixed(
            0
          ) + "%",
      }));

      res.json({
        courseId: courseObjectId,
        totalTimeSpent: totalTimeSpent.toFixed(0) + "m",
        timeSpentPerDate: timeSpentByDate,
      });
    } catch (error) {
      console.error("Error fetching time spent per date for course:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per date for a course
router.get(
  "/course/:courseId/average-grade-per-date",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);
      const results = await Course.aggregate([
        { $match: { _id: courseObjectId } },
        {
          $lookup: {
            from: "classes",
            localField: "classes_ref",
            foreignField: "_id",
            as: "classes",
          },
        },
        { $unwind: "$classes" },
        { $unwind: "$classes.subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "classes.subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $group: {
            _id: {
              courseId: "$course_name",
              courseName: "$course_name",
              subjectId: "$subject._id",
              subjectName: "$subject.subject_name",
              chapterId: "$chapter._id",
              chapterName: "$chapter.chapter_name",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$resultsByQuestion.is_correct", true] },
                      { $eq: ["$resultsByQuestion.is_not_correct", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            courseId: "$_id.courseId",
            courseName: "$_id.courseName",
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            date: "$_id.date",
            chapterId: "$_id.chapterId",
            chapterName: "$_id.chapterName",
            totalCorrect: 1,
            totalIncorrect: 1,
            totalQuestions: 1,
            grade: {
              $cond: [
                { $gt: [{ $add: ["$totalCorrect", "$totalIncorrect"] }, 0] },
                {
                  $divide: [
                    "$totalCorrect",
                    { $add: ["$totalCorrect", "$totalIncorrect"] },
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            courseName: 1,
            date: 1,
            subjectId: 1,
            subjectName: 1,
            grade: {
              $concat: [
                { $toString: { $round: [{ $multiply: ["$grade", 100] }, 2] } },
                "%",
              ],
            },
          },
        },
        { $sort: { courseId: 1, date: 1 } },
      ]);

      res.json({ courseId: courseObjectId, grades: results });
    } catch (error) {
      console.error("Error fetching average grade per date for course:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get questions done per date for a course
router.get(
  "/course/:courseId/total-correct-incorrect-per-date",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      const results = await Course.aggregate([
        { $match: { _id: courseObjectId } },
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
              questionId: "$resultsByQuestion._id",
            },
            is_correct: { $max: "$resultsByQuestion.is_correct" },
            is_not_correct: { $max: "$resultsByQuestion.is_not_correct" },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [{ $eq: ["$is_not_correct", true] }, 1, 0],
              },
            },
            totalQuestions: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$is_correct", true] },
                      { $eq: ["$is_not_correct", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalQuestions: "$totalQuestions",
          },
        },
        { $sort: { date: 1 } },
      ]);

      res.json({ courseId: courseObjectId, totalsPerDate: results });
    } catch (error) {
      console.error(
        "Error fetching total correct and incorrect per date for course:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all users for a specific course, excluding 'admin' and 'teacher'
router.get("/course/:courseId/users", async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const classes = await Class.find({ course_ref: courseId })
      .select("users_ref")
      .lean();

    if (classes.length === 0) {
      return res
        .status(404)
        .json({ message: "No classes found for this course" });
    }

    const userIds = classes.flatMap((c) => c.users_ref);
    const users = await User.find({
      _id: { $in: userIds },
      role: { $nin: ["admin", "teacher"] },
    })
      .select("_id first_name last_name")
      .lean()
      .sort({
        last_name: 1,
        first_name: 1,
      });

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PER CLASS -----------------------------------------------
// Get average time for users in a specific class
router.get(
  "/average-time/class/:classId",
  async (req: Request, res: Response) => {
    const classId = req.params.classId;
    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }
      const classObjectId = new mongoose.Types.ObjectId(classId);
      const classInfo = await Class.findById(classObjectId).populate({
        path: "users_ref",
        populate: {
          path: "quizzes_ref",
          model: "Quiz",
          select: "total_time_spent results_by_chapter_ref",
        },
      });
      if (!classInfo) {
        return res.status(404).json({ message: "Class not found" });
      }
      let totalQuizTime = 0;
      let totalQuizzes = 0;
      const uniqueChapterResults = new Map<
        string,
        { total_time_spent: string }
      >();
      for (const user of classInfo.users_ref as IUser[]) {
        for (const quiz of user.quizzes_ref as IQuiz[]) {
          if (quiz.total_time_spent) {
            const chapterRefs = quiz.results_by_chapter_ref;
            for (const chapterRef of chapterRefs) {
              const refId = chapterRef.toString();
              if (!uniqueChapterResults.has(refId)) {
                uniqueChapterResults.set(refId, {
                  total_time_spent: quiz.total_time_spent,
                });
                const [hours, minutes, seconds] = quiz.total_time_spent
                  .split(":")
                  .map(Number);
                totalQuizTime += hours * 3600 + minutes * 60 + seconds;
                totalQuizzes++;
              }
            }
          }
        }
      }
      const averageTimeInSeconds =
        totalQuizzes > 0 ? totalQuizTime / totalQuizzes : 0;
      const averageTimeFormatted = new Date(averageTimeInSeconds * 1000)
        .toISOString()
        .substr(11, 8);
      res.json({ averageTimeFormatted });
    } catch (error) {
      console.error(
        "Error fetching class and calculating average time:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade, correct answers count per subject and chapter for a class
router.get("/class/:classId/grades", async (req: Request, res: Response) => {
  const { classId } = req.params;
  console.log("classId", classId);
  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: "Invalid classId format" });
    }
    const classObjectId = new mongoose.Types.ObjectId(classId);
    const results = await Class.aggregate([
      { $match: { _id: classObjectId } },
      { $unwind: "$subjects_ref" },
      {
        $lookup: {
          from: "subjects",
          localField: "subjects_ref",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: "$subject" },
      {
        $unwind: {
          path: "$subject.chapters_ref",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "chapters",
          localField: "subject.chapters_ref",
          foreignField: "_id",
          as: "chapter",
        },
      },
      { $unwind: { path: "$chapter", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "resultsbychapters",
          localField: "chapter._id",
          foreignField: "chapter_ref",
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
        $unwind: {
          path: "$resultsByChapter.results_by_question_ref",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "resultsbyquestions",
          localField: "resultsByChapter.results_by_question_ref",
          foreignField: "_id",
          as: "resultsByQuestion",
        },
      },
      {
        $unwind: {
          path: "$resultsByQuestion",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            subjectId: "$subject._id",
            subjectName: "$subject.subject_name",
            chapterId: "$chapter._id",
            chapterName: "$chapter.chapter_name",
            questionId: "$resultsByQuestion._id",
          },
          isCorrect: { $first: "$resultsByQuestion.is_correct" },
          isNotCorrect: { $first: "$resultsByQuestion.is_not_correct" },
          notAnsweredYet: { $first: "$resultsByQuestion.not_answered_yet" },
        },
      },
      {
        $group: {
          _id: {
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            chapterId: "$_id.chapterId",
            chapterName: "$_id.chapterName",
          },
          correctAnswers: {
            $sum: {
              $cond: [{ $eq: ["$isCorrect", true] }, 1, 0],
            },
          },
          incorrectAnswers: {
            $sum: {
              $cond: [{ $eq: ["$isNotCorrect", true] }, 1, 0],
            },
          },
          notAnsweredYet: {
            $sum: {
              $cond: [{ $eq: ["$notAnsweredYet", true] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          totalQuestions: {
            $sum: ["$correctAnswers", "$incorrectAnswers", "$notAnsweredYet"],
          },
          averageGrade: {
            $concat: [
              {
                $toString: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            "$correctAnswers",
                            { $add: ["$correctAnswers", "$incorrectAnswers"] },
                          ],
                        },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              },
              "%",
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
          },
          chapters: {
            $push: {
              chapterId: "$_id.chapterId",
              chapterName: "$_id.chapterName",
              correctAnswers: "$correctAnswers",
              incorrectAnswers: "$incorrectAnswers",
              notAnsweredYet: "$notAnsweredYet",
              totalQuestions: "$totalQuestions",
              averageGrade: "$averageGrade",
            },
          },
          totalCorrect: { $sum: "$correctAnswers" },
          totalIncorrect: { $sum: "$incorrectAnswers" },
          totalNotAnsweredYet: { $sum: "$notAnsweredYet" },
          totalQuestions: { $sum: "$totalQuestions" },
        },
      },
      {
        $lookup: {
          from: "usersubjectprogresses", // Ensure this matches the collection name
          localField: "_id.subjectId",
          foreignField: "subject_ref",
          as: "userProgress",
        },
      },
      {
        $addFields: {
          totalQuestionsDone: {
            $ifNull: [
              { $arrayElemAt: ["$userProgress.total_questions_done", 0] },
              0,
            ],
          },
          overallAverageGrade: {
            $cond: {
              if: {
                $gt: [
                  { $arrayElemAt: ["$userProgress.total_questions_done", 0] },
                  0,
                ],
              },
              then: {
                $concat: [
                  {
                    $toString: {
                      $round: [
                        {
                          $multiply: [
                            {
                              $divide: [
                                { $add: ["$totalCorrect", "$totalIncorrect"] },
                                {
                                  $arrayElemAt: [
                                    "$userProgress.total_questions_done",
                                    0,
                                  ],
                                },
                              ],
                            },
                            100,
                          ],
                        },
                        0,
                      ],
                    },
                  },
                  "%",
                ],
              },
              else: "N/A",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          subjectId: "$_id.subjectId",
          subjectName: "$_id.subjectName",
          chapters: 1,
          totalCorrect: 1,
          totalIncorrect: 1,
          totalNotAnsweredYet: 1,
          totalQuestions: 1,
          totalQuestionsDone: 1,
          overallAverageGrade: 1,
        },
      },
      { $sort: { subjectName: 1 } },
    ]);

    res.json({ subjects: results });
  } catch (error) {
    console.error("Error fetching class grades:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users for a specific class, excluding 'admin' and 'teacher'
router.get("/class/:classId/users", async (req, res) => {
  try {
    const classId = req.params.classId;

    const users = await Class.aggregate([
      {
        $match: { _id: new Types.ObjectId(classId) },
      },
      {
        $unwind: "$users_ref",
      },
      {
        $lookup: {
          from: "users",
          localField: "users_ref",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $match: {
          "userDetails.role": { $nin: ["admin", "teacher"] },
        },
      },
      {
        $project: {
          _id: "$userDetails._id",
          first_name: "$userDetails.first_name",
          last_name: "$userDetails.last_name",
        },
      },
      {
        $sort: {
          last_name: 1,
          first_name: 1,
        },
      },
    ]).exec();

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found for this class" });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get average grade per mode for a class
router.get(
  "/class/:classId/average-grade-per-mode",
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }

      const classObjectId = new mongoose.Types.ObjectId(classId);

      const results = await Class.aggregate([
        { $match: { _id: classObjectId } },
        { $unwind: "$subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $group: {
            _id: "$resultsByChapter._id",
            classData: { $first: "$$ROOT" },
            chapterData: { $first: "$chapter" },
            resultsByQuestionRefs: {
              $first: "$resultsByChapter.results_by_question_ref",
            },
          },
        },
        { $unwind: "$resultsByQuestionRefs" },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByQuestionRefs",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $group: {
            _id: {
              classId: "$classData._id",
              className: "$classData.class_name",
              subjectId: "$chapterData.subject._id",
              subjectName: "$chapterData.subject.subject_name",
              chapterId: "$chapterData._id",
              chapterName: "$chapterData.chapter_name",
              doneByMode: "$resultsByQuestion.done_by_mode",
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalNotAnsweredYet: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.not_answered_yet", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: {
              classId: "$_id.classId",
              className: "$_id.className",
              doneByMode: "$_id.doneByMode",
            },
            totalCorrect: { $sum: "$totalCorrect" },
            totalIncorrect: { $sum: "$totalIncorrect" },
            totalNotAnsweredYet: { $sum: "$totalNotAnsweredYet" },
            totalQuestions: { $sum: "$totalQuestions" },
          },
        },
        {
          $project: {
            _id: 0,
            classId: "$_id.classId",
            className: "$_id.className",
            doneByMode: "$_id.doneByMode",
            totalCorrect: 1,
            totalIncorrect: 1,
            totalNotAnsweredYet: 1,
            totalQuestions: 1,
            averageGrade: {
              $concat: [
                {
                  $toString: {
                    $round: [
                      {
                        $multiply: [
                          { $divide: ["$totalCorrect", "$totalQuestions"] },
                          100,
                        ],
                      },
                      2,
                    ],
                  },
                },
                "%",
              ],
            },
          },
        },
        { $sort: { className: 1, doneByMode: 1 } },
      ]);
      res.json({ classId: classObjectId, grades: results });
    } catch (error) {
      console.error("Error fetching average grade by mode for class:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get time spent per mode for a class
router.get(
  "/class/:classId/time-spent-per-mode",
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }
      const classObjectId = new mongoose.Types.ObjectId(classId);

      const results = await Class.aggregate([
        { $match: { _id: classObjectId } },
        { $unwind: "$subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: {
              subjectId: "$subject._id",
              subjectName: "$subject.subject_name",
              doneByMode: "$quizzes.quiz_mode",
            },
            totalTimeSpentSeconds: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      {
                        $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 3600],
                      },
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 1] }, 60] },
                      { $arrayElemAt: ["$$timeParts", 2] },
                    ],
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
            doneByMode: "$_id.doneByMode",
            totalTimeSpent: {
              $concat: [
                {
                  $toString: {
                    $floor: { $divide: ["$totalTimeSpentSeconds", 60] },
                  },
                },
                "m ",
                { $toString: { $mod: ["$totalTimeSpentSeconds", 60] } },
                "s",
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              subjectId: "$subjectId",
              subjectName: "$subjectName",
            },
            timeSpentByMode: {
              $push: {
                doneByMode: "$doneByMode",
                totalTimeSpent: "$totalTimeSpent",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            timeSpentByMode: "$timeSpentByMode",
          },
        },
        {
          $group: {
            _id: null,
            classId: { $first: classObjectId },
            timeSpentBySubject: { $push: "$$ROOT" },
          },
        },
        {
          $project: {
            _id: 0,
            classId: 1,
            timeSpentBySubject: 1,
          },
        },
      ]);
      const timeSpentBySubjectMap = new Map<string, any>();
      results[0]?.timeSpentBySubject.forEach(
        (item: {
          [x: string]: any;
          subjectId: any;
          doneByMode: any;
          subjectName: any;
          totalTimeSpent: string;
        }) => {
          item.timeSpentByMode.forEach(
            (mode: { doneByMode: any; totalTimeSpent: string }) => {
              const key = `${item.subjectId}_${mode.doneByMode}`;
              if (!timeSpentBySubjectMap.has(key)) {
                timeSpentBySubjectMap.set(key, {
                  subjectId: item.subjectId,
                  subjectName: item.subjectName,
                  doneByMode: mode.doneByMode,
                  totalTimeSpent: mode.totalTimeSpent,
                });
              } else {
                const existing = timeSpentBySubjectMap.get(key);
                const [existingMinutes, existingSeconds] =
                  existing.totalTimeSpent
                    .split("m ")
                    .map((t: string) => t.replace("s", ""));
                const existingTotalSeconds =
                  parseInt(existingMinutes) * 60 + parseInt(existingSeconds);
                const [currentMinutes, currentSeconds] = mode.totalTimeSpent
                  .split("m ")
                  .map((t) => t.replace("s", ""));
                const currentTotalSeconds =
                  parseInt(currentMinutes) * 60 + parseInt(currentSeconds);
                const newTotalSeconds =
                  existingTotalSeconds + currentTotalSeconds;
                const minutes = Math.floor(newTotalSeconds / 60);
                const seconds = newTotalSeconds % 60;
                existing.totalTimeSpent = `${minutes}m ${seconds}s`;
              }
            }
          );
        }
      );
      const processedResults = Array.from(timeSpentBySubjectMap.values());
      res.json({
        classId: classObjectId,
        timeSpentBySubject: processedResults,
      });
    } catch (error) {
      console.error("Error fetching time spent per mode for class:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per exam mode per class
router.get(
  "/class/:classId/average-grade-per-exam-mode",
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }
      const classObjectId = new mongoose.Types.ObjectId(classId);

      const results = await Class.aggregate([
        { $match: { _id: classObjectId } },
        { $unwind: "$subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $match: {
            "resultsByQuestion.done_by_mode": "exam",
          },
        },
        {
          $group: {
            _id: {
              subjectId: "$subject._id",
              subjectName: "$subject.subject_name",
              doneByMode: "$resultsByQuestion.done_by_mode",
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalNotAnsweredYet: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.not_answered_yet", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: {
              subjectId: "$_id.subjectId",
              subjectName: "$_id.subjectName",
              doneByMode: "$_id.doneByMode",
            },
            totalCorrect: { $sum: "$totalCorrect" },
            totalIncorrect: { $sum: "$totalIncorrect" },
            totalNotAnsweredYet: { $sum: "$totalNotAnsweredYet" },
            totalQuestions: { $sum: "$totalQuestions" },
            averageGrade: {
              $avg: {
                $multiply: [
                  { $divide: ["$totalCorrect", "$totalQuestions"] },
                  100,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            doneByMode: "$_id.doneByMode",
            averageGrade: {
              $concat: [{ $toString: { $round: ["$averageGrade", 2] } }, "%"],
            },
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalNotAnsweredYet: "$totalNotAnsweredYet",
            totalQuestions: "$totalQuestions",
          },
        },
        { $sort: { subjectName: 1, doneByMode: 1 } },
      ]);

      res.json({ classId: classObjectId, grades: results });
    } catch (error) {
      console.error(
        "Error fetching average grade per exam mode for subjects:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per date per exam mode for a class
router.get(
  "/class/:classId/average-grade-per-date-per-exam-mode",
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }
      const classObjectId = new mongoose.Types.ObjectId(classId);

      const results = await Class.aggregate([
        { $match: { _id: classObjectId } },
        { $unwind: "$subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $match: {
            "resultsByQuestion.done_by_mode": "exam",
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalNotAnsweredYet: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.not_answered_yet", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            averageGrade: {
              $cond: [
                { $gt: ["$totalQuestions", 0] },
                {
                  $concat: [
                    {
                      $toString: {
                        $round: [
                          {
                            $multiply: [
                              { $divide: ["$totalCorrect", "$totalQuestions"] },
                              100,
                            ],
                          },
                          2,
                        ],
                      },
                    },
                    "%",
                  ],
                },
                "N/A",
              ],
            },
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalNotAnsweredYet: "$totalNotAnsweredYet",
            totalQuestions: "$totalQuestions",
          },
        },
        { $sort: { date: 1 } },
      ]);

      res.json({ classId: classObjectId, gradesPerDate: results });
    } catch (error) {
      console.error("Error fetching average grade per date for class:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get questions done per date for a class
router.get(
  "/class/:classId/total-correct-incorrect-per-date",
  async (req: Request, res: Response) => {
    const { classId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }
      const classObjectId = new mongoose.Types.ObjectId(classId);

      const results = await Class.aggregate([
        { $match: { _id: classObjectId } },
        { $unwind: "$subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $lookup: {
            from: "usersubjectprogresses",
            let: {
              userRef: "$resultsByQuestion.user_ref",
              subjectRef: "$subject._id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$user_ref", "$$userRef"] },
                      { $eq: ["$subject_ref", "$$subjectRef"] },
                    ],
                  },
                },
              },
            ],
            as: "userSubjectProgress",
          },
        },
        {
          $unwind: {
            path: "$userSubjectProgress",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
              questionId: "$resultsByQuestion._id",
            },
            is_correct: { $max: "$resultsByQuestion.is_correct" },
            is_not_correct: { $max: "$resultsByQuestion.is_not_correct" },
            total_questions_done: {
              $max: "$userSubjectProgress.total_questions_done",
            },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [{ $eq: ["$is_not_correct", true] }, 1, 0],
              },
            },
            totalQuestions: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$is_correct", true] },
                      { $eq: ["$is_not_correct", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalQuestionsDone: { $sum: "$total_questions_done" },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalQuestions: "$totalQuestions",
            totalQuestionsDone: "$totalQuestionsDone",
          },
        },
        { $sort: { date: 1 } },
      ]);

      res.json({ classId: classObjectId, totalsPerDate: results });
    } catch (error) {
      console.error(
        "Error fetching total correct and incorrect per date for class:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get percentage time spent per mode for a class
router.get(
  "/class/:classId/time-spent-per-mode-percentage",
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }
      const classObjectId = new mongoose.Types.ObjectId(classId);

      const results = await Class.aggregate([
        { $match: { _id: classObjectId } },
        { $unwind: "$subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: "$quizzes.quiz_mode",
            totalTimeSpentSeconds: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      {
                        $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 3600],
                      }, // Hours to seconds
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 1] }, 60] }, // Minutes to seconds
                      { $arrayElemAt: ["$$timeParts", 2] }, // Seconds
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalTimeSpent: { $sum: "$totalTimeSpentSeconds" },
            modes: {
              $push: {
                doneByMode: "$_id",
                totalTimeSpentSeconds: "$totalTimeSpentSeconds",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            classId: classObjectId,
            totalTimeSpent: {
              $concat: [
                {
                  $toString: { $floor: { $divide: ["$totalTimeSpent", 3600] } },
                },
                "h ",
                {
                  $toString: {
                    $floor: {
                      $divide: [{ $mod: ["$totalTimeSpent", 3600] }, 60],
                    },
                  },
                },
                "m ",
                { $toString: { $mod: ["$totalTimeSpent", 60] } },
                "s",
              ],
            },
            timeSpentByMode: {
              $map: {
                input: "$modes",
                as: "mode",
                in: {
                  doneByMode: "$$mode.doneByMode",
                  totalTimeSpentSeconds: "$$mode.totalTimeSpentSeconds",
                  totalTimeSpentPercentage: {
                    $concat: [
                      {
                        $toString: {
                          $round: [
                            {
                              $multiply: [
                                {
                                  $divide: [
                                    "$$mode.totalTimeSpentSeconds",
                                    "$totalTimeSpent",
                                  ],
                                },
                                100,
                              ],
                            },
                            2,
                          ],
                        },
                      },
                      "%",
                    ],
                  },
                  formattedTotalTimeSpent: {
                    $concat: [
                      {
                        $toString: {
                          $floor: {
                            $divide: ["$$mode.totalTimeSpentSeconds", 3600],
                          },
                        },
                      },
                      "h ",
                      {
                        $toString: {
                          $floor: {
                            $divide: [
                              { $mod: ["$$mode.totalTimeSpentSeconds", 3600] },
                              60,
                            ],
                          },
                        },
                      },
                      "m ",
                      {
                        $toString: {
                          $mod: ["$$mode.totalTimeSpentSeconds", 60],
                        },
                      },
                      "s",
                    ],
                  },
                },
              },
            },
          },
        },
      ]);

      res.json({
        classId: classObjectId,
        totalTimeSpent: results[0]?.totalTimeSpent || "0h 0m 0s",
        timeSpentByMode: results[0]?.timeSpentByMode || [],
      });
    } catch (error) {
      console.error(
        "Error fetching time spent per mode percentage for class:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get time spent per date for a class
router.get(
  "/class/:classId/time-spent-per-date",
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }
      const classObjectId = new mongoose.Types.ObjectId(classId);
      const results = await Class.aggregate([
        { $match: { _id: classObjectId } },
        { $unwind: "$subjects_ref" },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$quizzes.date" },
              },
              classId: classObjectId,
              className: "$class_name",
            },
            totalTimeSpentMinutes: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 60] },
                      {
                        $add: [
                          { $arrayElemAt: ["$$timeParts", 1] },
                          {
                            $divide: [{ $arrayElemAt: ["$$timeParts", 2] }, 60],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            totalTimeSpent: {
              $concat: [
                { $toString: { $floor: "$totalTimeSpentMinutes" } },
                "m",
              ],
            },
          },
        },
        {
          $sort: {
            date: 1,
          },
        },
      ]);
      const totalTimeSpent = results.reduce(
        (acc, curr) => acc + parseFloat(curr.totalTimeSpent),
        0
      );
      const timeSpentByDate = results.map((item) => ({
        ...item,
        totalTimeSpentPercentage:
          ((parseFloat(item.totalTimeSpent) / totalTimeSpent) * 100).toFixed(
            2
          ) + "%",
      }));

      res.json({
        classId: classObjectId,
        totalTimeSpent: totalTimeSpent.toFixed(2) + "m",
        timeSpentPerDate: timeSpentByDate,
      });
    } catch (error) {
      console.error("Error fetching time spent per date for class:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per date for class
router.get(
  "/class/:classId/average-grade-per-date",
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: "Invalid classId format" });
      }

      const classObjectId = new mongoose.Types.ObjectId(classId);

      const results = await Class.aggregate([
        { $match: { _id: classObjectId } },
        {
          $lookup: {
            from: "subjects",
            localField: "subjects_ref",
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
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $group: {
            _id: {
              classId: "$class_name",
              className: "$class_name",
              subjectId: "$subject._id",
              subjectName: "$subject.subject_name",
              chapterId: "$chapter._id",
              chapterName: "$chapter.chapter_name",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$resultsByQuestion.is_correct", true] },
                      { $eq: ["$resultsByQuestion.is_not_correct", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            classId: "$_id.classId",
            className: "$_id.className",
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            date: "$_id.date",
            chapterId: "$_id.chapterId",
            chapterName: "$_id.chapterName",
            totalCorrect: 1,
            totalIncorrect: 1,
            totalQuestions: 1,
            grade: {
              $cond: [
                { $gt: [{ $add: ["$totalCorrect", "$totalIncorrect"] }, 0] },
                {
                  $divide: [
                    "$totalCorrect",
                    { $add: ["$totalCorrect", "$totalIncorrect"] },
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            className: 1,
            date: 1,
            subjectId: 1,
            subjectName: 1,
            grade: {
              $concat: [
                { $toString: { $round: [{ $multiply: ["$grade", 100] }, 2] } },
                "%",
              ],
            },
          },
        },
        { $sort: { classId: 1, date: 1 } },
      ]);

      res.json({ classId: classObjectId, grades: results });
    } catch (error) {
      console.error("Error fetching average grade per date for class:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PER SUBJECT -----------------------------------------------
// Get average grade per chapter for a subject
router.get(
  "/subject/:subjectId/grades",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }
      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      // Step 1: Retrieve the subject and associated chapters
      const subject = await Subject.findById(subjectObjectId).populate({
        path: "chapters_ref",
      });

      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      const chapters = subject.chapters_ref;
      const results: any = [];

      // Step 2: Process each chapter individually
      for (const chapter of chapters as any) {
        const chapterId = chapter._id;
        const chapterName = chapter.chapter_name;

        // Retrieve results by chapter
        const resultsByChapter = await ResultsByChapter.find({
          chapter_ref: chapterId,
        }).populate("results_by_question_ref");

        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalNotAnsweredYet = 0;

        // Calculate the results for this chapter
        for (const result of resultsByChapter) {
          for (const question of result.results_by_question_ref as any) {
            if (question.is_correct) totalCorrect++;
            if (question.is_not_correct) totalIncorrect++;
            if (question.not_answered_yet) totalNotAnsweredYet++;
          }
        }

        // Step 3: Retrieve and sum the totalQuestionsDone from UserChapterProgress
        const chapterProgress = await UserChapterProgress.aggregate([
          { $match: { chapter_ref: chapterId } },
          {
            $group: {
              _id: null,
              totalQuestionsDone: { $sum: "$total_questions_done" },
            },
          },
        ]);

        const totalQuestionsDone =
          chapterProgress.length > 0
            ? chapterProgress[0].totalQuestionsDone
            : 0;

        const totalQuestions =
          totalCorrect + totalIncorrect + totalNotAnsweredYet;

        // Step 4: Calculate the average grade and store the result
        const averageGrade =
          totalQuestionsDone > 0
            ? `${Math.round(
                ((totalCorrect + totalIncorrect) / totalQuestionsDone) * 100
              )}%`
            : "N/A";

        results.push({
          chapterId,
          chapterName,
          totalCorrect,
          totalIncorrect,
          totalNotAnsweredYet,
          totalQuestions,
          chapterQuestionsDone: totalQuestionsDone,
          averageGrade,
        });
      }

      // Step 5: Sort the results by chapter name and send the response
      results.sort((a: any, b: any) =>
        a.chapterName.localeCompare(b.chapterName)
      );

      if (results.length > 0) {
        res.json({ chapters: results });
      } else {
        res.status(404).json({ message: "No data found for this subject" });
      }
    } catch (error) {
      console.error(
        "Error fetching average grade per chapter for subject:",
        error
      );
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// Get average grade per mode for a subject
router.get(
  "/subject/:subjectId/average-grade-per-mode",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }
      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      // Step 1: Retrieve all classes that include the given subjectId
      const classes = await Class.find({ subjects_ref: subjectObjectId })
        .populate({
          path: "subjects_ref",
          match: { _id: subjectObjectId },
          populate: {
            path: "chapters_ref",
          },
        })
        .exec();

      const gradesPerMode: any = {};

      // Step 2: Process each class, subject, and chapter
      for (const classItem of classes) {
        for (const subject of classItem.subjects_ref) {
          for (const chapter of subject.chapters_ref) {
            // Retrieve all quiz results by chapter
            const resultsByChapter = await ResultsByChapter.find({
              chapter_ref: chapter._id,
            }).populate("results_by_question_ref");

            const modeResults: any = {};

            for (const result of resultsByChapter) {
              for (const question of result.results_by_question_ref as any) {
                const mode = question.done_by_mode;

                if (!modeResults[mode]) {
                  modeResults[mode] = {
                    correctAnswers: 0,
                    incorrectAnswers: 0,
                    notAnsweredYet: 0,
                    totalQuestions: 0,
                  };
                }

                if (question.is_correct) modeResults[mode].correctAnswers++;
                if (question.is_not_correct)
                  modeResults[mode].incorrectAnswers++;
                if (question.not_answered_yet)
                  modeResults[mode].notAnsweredYet++;

                modeResults[mode].totalQuestions++;
              }
            }

            // Step 3: Aggregate the results per mode
            for (const mode of Object.keys(modeResults)) {
              if (!gradesPerMode[mode]) {
                gradesPerMode[mode] = {
                  subjectId: subject._id,
                  subjectName: subject.subject_name,
                  doneByMode: mode,
                  totalCorrect: 0,
                  totalIncorrect: 0,
                  totalNotAnsweredYet: 0,
                  totalQuestions: 0,
                };
              }

              gradesPerMode[mode].totalCorrect +=
                modeResults[mode].correctAnswers;
              gradesPerMode[mode].totalIncorrect +=
                modeResults[mode].incorrectAnswers;
              gradesPerMode[mode].totalNotAnsweredYet +=
                modeResults[mode].notAnsweredYet;
              gradesPerMode[mode].totalQuestions +=
                modeResults[mode].totalQuestions;
            }
          }
        }
      }

      // Step 4: Calculate the average grade for each mode
      const results = Object.values(gradesPerMode).map((modeResult: any) => {
        const { totalCorrect, totalQuestions } = modeResult;
        const averageGrade =
          totalQuestions > 0
            ? `${Math.round((totalCorrect / totalQuestions) * 100)}%`
            : "N/A";

        return {
          ...modeResult,
          averageGrade,
        };
      });

      // Step 5: Sort the results and return the response
      results.sort(
        (a, b) =>
          a.subjectName.localeCompare(b.subjectName) ||
          a.doneByMode.localeCompare(b.doneByMode)
      );

      res.json({ subjects: results });
    } catch (error) {
      console.error("Error fetching quiz grades by mode:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per exam mode per subject
router.get(
  "/subject/:subjectId/average-grade-per-exam-mode",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }

      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      const results = await Subject.aggregate([
        { $match: { _id: subjectObjectId } },
        { $unwind: "$chapters_ref" },
        {
          $lookup: {
            from: "chapters",
            localField: "chapters_ref",
            foreignField: "_id",
            as: "chapter",
          },
        },
        { $unwind: "$chapter" },
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $match: {
            "resultsByQuestion.done_by_mode": "exam",
          },
        },
        {
          $group: {
            _id: {
              chapterId: "$chapter._id",
              chapterName: "$chapter.chapter_name",
              doneByMode: "$resultsByQuestion.done_by_mode",
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalNotAnsweredYet: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.not_answered_yet", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: {
              chapterId: "$_id.chapterId",
              chapterName: "$_id.chapterName",
              doneByMode: "$_id.doneByMode",
            },
            totalCorrect: { $sum: "$totalCorrect" },
            totalIncorrect: { $sum: "$totalIncorrect" },
            totalNotAnsweredYet: { $sum: "$totalNotAnsweredYet" },
            totalQuestions: { $sum: "$totalQuestions" },
            averageGrade: {
              $avg: {
                $multiply: [
                  { $divide: ["$totalCorrect", "$totalQuestions"] },
                  100,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            chapterId: "$_id.chapterId",
            chapterName: "$_id.chapterName",
            doneByMode: "$_id.doneByMode",
            averageGrade: {
              $concat: [{ $toString: { $round: ["$averageGrade", 2] } }, "%"],
            },
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalNotAnsweredYet: "$totalNotAnsweredYet",
            totalQuestions: "$totalQuestions",
          },
        },
        { $sort: { chapterName: 1, doneByMode: 1 } },
      ]);

      res.json({ subjectId: subjectObjectId, grades: results });
    } catch (error) {
      console.error(
        "Error fetching average grade per exam mode for chapters:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per date per exam mode for a subject
router.get(
  "/subject/:subjectId/average-grade-per-date-per-exam-mode",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }
      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      const results = await Subject.aggregate([
        { $match: { _id: subjectObjectId } },
        { $unwind: "$chapters_ref" },
        {
          $lookup: {
            from: "chapters",
            localField: "chapters_ref",
            foreignField: "_id",
            as: "chapter",
          },
        },
        { $unwind: "$chapter" },
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $match: {
            "resultsByQuestion.done_by_mode": "exam",
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalNotAnsweredYet: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.not_answered_yet", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            averageGrade: {
              $cond: [
                { $gt: ["$totalQuestions", 0] },
                {
                  $concat: [
                    {
                      $toString: {
                        $round: [
                          {
                            $multiply: [
                              { $divide: ["$totalCorrect", "$totalQuestions"] },
                              100,
                            ],
                          },
                          2,
                        ],
                      },
                    },
                    "%",
                  ],
                },
                "N/A",
              ],
            },
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalNotAnsweredYet: "$totalNotAnsweredYet",
            totalQuestions: "$totalQuestions",
          },
        },
        { $sort: { date: 1 } },
      ]);

      res.json({ subjectId: subjectObjectId, gradesPerDate: results });
    } catch (error) {
      console.error(
        "Error fetching average grade per date for subject:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get average grade per date for a subject
router.get(
  "/subject/:subjectId/average-grade-per-date",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }

      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      const results = await Subject.aggregate([
        { $match: { _id: subjectObjectId } },
        {
          $lookup: {
            from: "chapters",
            localField: "chapters_ref",
            foreignField: "_id",
            as: "chapters",
          },
        },
        { $unwind: "$chapters" },
        {
          $lookup: {
            from: "quizzes",
            localField: "chapters._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $group: {
            _id: {
              subjectId: "$subject._id",
              subjectName: "$subject.subject_name",
              chapterId: "$chapters._id",
              chapterName: "$chapters.chapter_name",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
            },
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$resultsByQuestion.is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [
                  { $eq: ["$resultsByQuestion.is_not_correct", true] },
                  1,
                  0,
                ],
              },
            },
            totalQuestions: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$resultsByQuestion.is_correct", true] },
                      { $eq: ["$resultsByQuestion.is_not_correct", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            subjectId: "$_id.subjectId",
            subjectName: "$_id.subjectName",
            chapterId: "$_id.chapterId",
            chapterName: "$_id.chapterName",
            date: "$_id.date",
            totalCorrect: 1,
            totalIncorrect: 1,
            totalQuestions: 1,
            grade: {
              $cond: [
                { $gt: [{ $add: ["$totalCorrect", "$totalIncorrect"] }, 0] },
                {
                  $divide: [
                    "$totalCorrect",
                    { $add: ["$totalCorrect", "$totalIncorrect"] },
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            subjectId: 1,
            subjectName: 1,
            date: 1,
            chapterId: 1,
            chapterName: 1,
            grade: {
              $concat: [
                { $toString: { $round: [{ $multiply: ["$grade", 100] }, 2] } },
                "%",
              ],
            },
          },
        },
        { $sort: { subjectId: 1, date: 1 } },
      ]);

      res.json({ subjectId: subjectObjectId, grades: results });
    } catch (error) {
      console.error(
        "Error fetching average grade per date for subject:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get questions done per date for a subject
router.get(
  "/subject/:subjectId/total-correct-incorrect-per-date",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }
      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      const results = await Subject.aggregate([
        { $match: { _id: subjectObjectId } },
        { $unwind: "$chapters_ref" },
        {
          $lookup: {
            from: "chapters",
            localField: "chapters_ref",
            foreignField: "_id",
            as: "chapter",
          },
        },
        { $unwind: "$chapter" },
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $lookup: {
            from: "resultsbychapters",
            localField: "quizzes.results_by_chapter_ref",
            foreignField: "_id",
            as: "resultsByChapter",
          },
        },
        { $unwind: "$resultsByChapter" },
        {
          $unwind: "$resultsByChapter.results_by_question_ref",
        },
        {
          $lookup: {
            from: "resultsbyquestions",
            localField: "resultsByChapter.results_by_question_ref",
            foreignField: "_id",
            as: "resultsByQuestion",
          },
        },
        { $unwind: "$resultsByQuestion" },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$resultsByQuestion.date",
                },
              },
              questionId: "$resultsByQuestion._id",
            },
            is_correct: { $max: "$resultsByQuestion.is_correct" },
            is_not_correct: { $max: "$resultsByQuestion.is_not_correct" },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            totalCorrect: {
              $sum: {
                $cond: [{ $eq: ["$is_correct", true] }, 1, 0],
              },
            },
            totalIncorrect: {
              $sum: {
                $cond: [{ $eq: ["$is_not_correct", true] }, 1, 0],
              },
            },
            totalQuestions: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$is_correct", true] },
                      { $eq: ["$is_not_correct", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            totalCorrect: "$totalCorrect",
            totalIncorrect: "$totalIncorrect",
            totalQuestions: { $sum: ["$totalCorrect", "$totalIncorrect"] },
          },
        },
        { $sort: { date: 1 } },
      ]);
      res.json({ subjectId: subjectObjectId, totalsPerDate: results });
    } catch (error) {
      console.error(
        "Error fetching total correct and incorrect per date for subject:",
        error
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get time spent per mode per subject
router.get(
  "/subject/:subjectId/time-spent-per-mode",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }
      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);
      const results = await Subject.aggregate([
        { $match: { _id: subjectObjectId } },
        { $unwind: "$chapters_ref" },
        {
          $lookup: {
            from: "chapters",
            localField: "chapters_ref",
            foreignField: "_id",
            as: "chapter",
          },
        },
        { $unwind: "$chapter" },
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: {
              subjectId: "$chapter.subject._id",
              subjectName: "$chapter.subject.subject_name",
              chapterId: "$chapter._id",
              chapterName: "$chapter.chapter_name",
              doneByMode: "$quizzes.quiz_mode",
            },
            totalTimeSpentSeconds: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      {
                        $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 3600],
                      },
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 1] }, 60] },
                      { $arrayElemAt: ["$$timeParts", 2] },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            chapterId: "$_id.chapterId",
            chapterName: "$_id.chapterName",
            doneByMode: "$_id.doneByMode",
            totalTimeSpent: {
              $concat: [
                {
                  $toString: {
                    $floor: { $divide: ["$totalTimeSpentSeconds", 60] },
                  },
                },
                "m ",
                { $toString: { $mod: ["$totalTimeSpentSeconds", 60] } },
                "s",
              ],
            },
          },
        },
        {
          $sort: {
            chapterId: 1,
            doneByMode: 1,
          },
        },
      ]);
      res.json({ subjectId: subjectObjectId, timeSpent: results });
    } catch (error) {
      console.error("Error fetching time spent per mode for subject:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get time spent percentage per subject
// Get time spent percentage per subject
router.get(
  "/subject/:subjectId/time-spent-per-mode-percentage",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }
      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      const results = await Subject.aggregate([
        { $match: { _id: subjectObjectId } },
        { $unwind: "$chapters_ref" },
        {
          $lookup: {
            from: "chapters",
            localField: "chapters_ref",
            foreignField: "_id",
            as: "chapter",
          },
        },
        { $unwind: "$chapter" },
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: "$quizzes.quiz_mode",
            totalTimeSpentSeconds: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      {
                        $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 3600],
                      },
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 1] }, 60] },
                      { $arrayElemAt: ["$$timeParts", 2] },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalTimeSpentSeconds: { $sum: "$totalTimeSpentSeconds" },
            timeSpentByMode: {
              $push: {
                doneByMode: "$_id",
                totalTimeSpentSeconds: "$totalTimeSpentSeconds",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            subjectId: subjectObjectId,
            totalTimeSpent: {
              $concat: [
                {
                  $toString: {
                    $floor: { $divide: ["$totalTimeSpentSeconds", 3600] },
                  },
                },
                "h ",
                {
                  $toString: {
                    $floor: {
                      $divide: [{ $mod: ["$totalTimeSpentSeconds", 3600] }, 60],
                    },
                  },
                },
                "m ",
                { $toString: { $mod: ["$totalTimeSpentSeconds", 60] } },
                "s",
              ],
            },
            timeSpentByMode: {
              $map: {
                input: "$timeSpentByMode",
                as: "mode",
                in: {
                  doneByMode: "$$mode.doneByMode",
                  totalTimeSpentSeconds: "$$mode.totalTimeSpentSeconds",
                  totalTimeSpentPercentage: {
                    $concat: [
                      {
                        $toString: {
                          $round: [
                            {
                              $multiply: [
                                {
                                  $divide: [
                                    "$$mode.totalTimeSpentSeconds",
                                    "$totalTimeSpentSeconds",
                                  ],
                                },
                                100,
                              ],
                            },
                            2,
                          ],
                        },
                      },
                      "%",
                    ],
                  },
                  formattedTotalTimeSpent: {
                    $concat: [
                      {
                        $toString: {
                          $floor: {
                            $divide: ["$$mode.totalTimeSpentSeconds", 3600],
                          },
                        },
                      },
                      "h ",
                      {
                        $toString: {
                          $floor: {
                            $divide: [
                              { $mod: ["$$mode.totalTimeSpentSeconds", 3600] },
                              60,
                            ],
                          },
                        },
                      },
                      "m ",
                      {
                        $toString: {
                          $mod: ["$$mode.totalTimeSpentSeconds", 60],
                        },
                      },
                      "s",
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            timeSpentByMode: {
              $cond: {
                if: { $gt: [{ $size: "$timeSpentByMode" }, 0] },
                then: "$timeSpentByMode",
                else: [
                  {
                    doneByMode: "No data",
                    totalTimeSpentSeconds: 0,
                    totalTimeSpentPercentage: "0.00%",
                    formattedTotalTimeSpent: "0h 0m 0s",
                  },
                ],
              },
            },
          },
        },
      ]);

      res.json(results[0]);
    } catch (error) {
      console.error("Error fetching time spent per mode for subject:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get time spent per date for a subject
router.get(
  "/subject/:subjectId/time-spent-per-date",
  async (req: Request, res: Response) => {
    const { subjectId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: "Invalid subjectId format" });
      }
      const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

      const results = await Subject.aggregate([
        { $match: { _id: subjectObjectId } },
        { $unwind: "$chapters_ref" },
        {
          $lookup: {
            from: "chapters",
            localField: "chapters_ref",
            foreignField: "_id",
            as: "chapter",
          },
        },
        { $unwind: "$chapter" },
        {
          $lookup: {
            from: "quizzes",
            localField: "chapter._id",
            foreignField: "chapters_ref",
            as: "quizzes",
          },
        },
        { $unwind: "$quizzes" },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$quizzes.date" },
              },
              subjectId: subjectObjectId,
              subjectName: "$subject_name",
            },
            totalTimeSpentMinutes: {
              $sum: {
                $let: {
                  vars: {
                    timeParts: {
                      $map: {
                        input: { $split: ["$quizzes.total_time_spent", ":"] },
                        as: "part",
                        in: { $toInt: "$$part" },
                      },
                    },
                  },
                  in: {
                    $add: [
                      { $multiply: [{ $arrayElemAt: ["$$timeParts", 0] }, 60] },
                      {
                        $add: [
                          { $arrayElemAt: ["$$timeParts", 1] },
                          {
                            $divide: [{ $arrayElemAt: ["$$timeParts", 2] }, 60],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            totalTimeSpent: {
              $concat: [
                { $toString: { $floor: "$totalTimeSpentMinutes" } },
                "m",
              ],
            },
          },
        },
        {
          $sort: {
            date: 1,
          },
        },
      ]);
      const totalTimeSpent = results.reduce(
        (acc, curr) => acc + parseFloat(curr.totalTimeSpent),
        0
      );
      const timeSpentByDate = results.map((item) => ({
        ...item,
        totalTimeSpentPercentage:
          ((parseFloat(item.totalTimeSpent) / totalTimeSpent) * 100).toFixed(
            2
          ) + "%",
      }));

      res.json({
        subjectId: subjectObjectId,
        totalTimeSpent: totalTimeSpent.toFixed(2) + "m",
        timeSpentPerDate: timeSpentByDate,
      });
    } catch (error) {
      console.error("Error fetching time spent per date for subject:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.get(
  "/course/:courseId/total-questions",
  async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId format" });
      }
      const courseObjectId = new mongoose.Types.ObjectId(courseId);


      // retrieve users
      const users = await User.find({ course_ref: courseId });

      // Step 1: Retrieve classes associated with the course
      const classes = await Class.find({ course_ref: courseObjectId }).populate(
        {
          path: "subjects_ref",
          populate: {
            path: "chapters_ref",
            select: "questions_ref", // Only populate questions_ref
          },
        }
      );

      if (!classes || classes.length === 0) {
        return res
          .status(404)
          .json({ message: "No classes found for this course" });
      }

      // Step 2: Calculate the total number of questions in all chapters of all subjects
      let totalQuestionsInCourse = 0;

      for (const classItem of classes) {
        for (const subject of classItem.subjects_ref) {
          for (const chapter of subject.chapters_ref as any) {
            // Calculate the total number of questions by counting the questions_ref array length
            totalQuestionsInCourse += chapter.questions_ref.length;
          }
        }
      }

      // Step 3: Count the number of student associated with the course
      const userCount = await User.countDocuments({
        classes_ref: { $in: classes.map((cls) => cls._id) },
        role: "student",
      });

      // Step 4: Calculate total questions multiplied by the number of users
      const totalQuestionsMultipliedByUsers =
        totalQuestionsInCourse * userCount;

      // Step 5: Send the result
      res.json({
        courseId: courseObjectId,
        totalQuestionsInCourse,
        userCount,
        totalQuestionsMultipliedByUsers,
        noUsers: users?.length || 0
      });
    } catch (error) {
      console.error("Error fetching total questions in course:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// router.get("/get-course-data", async (req, res) => {
//   const { courseId, subjectId, chapterId } = req.query;

//   try {
//     if (!courseId || !subjectId || !chapterId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Missing required query parameters" });
//     }

//     const classes = await Class.findOne({ course_ref: courseId });
//     if (!classes) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Class not found" });
//     }

//     const subjectExists = classes.subjects_ref.some(
//       (subjRef) => subjRef.toString() === subjectId
//     );
//     if (!subjectExists) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Subject not found in the class" });
//     }

//     const chapter = await Chapter.findOne({
//       _id: chapterId,
//       subject_ref: subjectId,
//     });
//     if (!chapter) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Chapter not found for the subject" });
//     }

//     // Step 4: Get the Quiz for the user and chapter to retrieve results_by_chapter_ref
//     const quiz = await Quiz.findOne({
//       chapters_ref: chapterId,
//     }).select("results_by_chapter_ref");

//     if (!quiz) {
//       return res.status(404).json({
//         success: false,
//         message: "Quiz not found for the user and chapter",
//       });
//     }

//     // Step 5: Get questions for the chapter
//     const questions = await Question.find({ chapter_ref: chapterId });

//     // Step 6: Retrieve user's results for each question using results_by_chapter_ref
//     const resultsByQuestion = await ResultsByQuestion.find({
//       question_ref: { $in: questions.map((q) => q._id) },
//       results_by_chapter_ref: { $in: quiz.results_by_chapter_ref },
//     });

//     // Map questions with their corresponding results
//     const questionsWithResults = questions.map((question: any) => {
//       const result = resultsByQuestion.find(
//         (rq: any) => rq.question_ref.toString() === question._id.toString()
//       );

//       return {
//         ...question.toObject(),
//         result: result
//           ? {
//               is_correct: result.is_correct,
//               is_not_correct: result.is_not_correct,
//               not_answered_yet: result.not_answered_yet,
//               to_fill_user_answer: result.to_fill_user_answer,
//               time_spent_per_question: result.time_spent_per_question,
//             }
//           : null,
//       };
//     });

//     return res
//       .status(200)
//       .json({ success: true, result: questionsWithResults });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// });




router.get("/get-course-data", async (req, res) => {
  const { courseId, subjectId, chapterId } = req.query;

  try {
    if (!courseId || !subjectId || !chapterId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required query parameters" });
    }

    const classes = await Class.findOne({ course_ref: courseId });
    if (!classes) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const subjectExists = classes.subjects_ref.some(
      (subjRef) => subjRef.toString() === subjectId
    );
    if (!subjectExists) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found in the class" });
    }

    const chapter = await Chapter.findOne({
      _id: chapterId,
      subject_ref: subjectId,
    });
    if (!chapter) {
      return res
        .status(404)
        .json({ success: false, message: "Chapter not found for the subject" });
    }

    // Step 4: Get all quizzes for the chapter to retrieve results_by_chapter_ref and user_ref
    const quizzes = await Quiz.find({
      chapters_ref: chapterId,
    }).select("results_by_chapter_ref user_ref");

    if (!quizzes.length) {
      return res.status(404).json({
        success: false,
        message: "No quizzes found for the chapter",
      });
    }

    // Step 5: Get questions for the chapter
    const questions = await Question.find({ chapter_ref: chapterId });

    // Step 6: Prepare a mapping of question IDs to users and their results
    const questionsWithResults = await Promise.all(
      questions.map(async (question) => {
        const questionResults = new Map();

        for (const quiz of quizzes) {
          const user:any = await User.findById(quiz.user_ref).select(
            "first_name last_name"
          );

          const fullName = `${user.first_name} ${user.last_name}`;

          const result = await ResultsByQuestion.findOne({
            question_ref: question._id,
            results_by_chapter_ref: { $in: quiz.results_by_chapter_ref },
          });

          if (!questionResults.has(fullName)) {
            questionResults.set(fullName, {
              user: fullName,
              result: result
                ? {
                    is_correct: result.is_correct,
                    is_not_correct: result.is_not_correct,
                    not_answered_yet: result.not_answered_yet,
                    to_fill_user_answer: result.to_fill_user_answer,
                    time_spent_per_question: result.time_spent_per_question,
                  }
                : null,
            });
          }
        }

        return {
          ...question.toObject(),
          results: Array.from(questionResults.values()),
        };
      })
    );

    return res.status(200).json({
      success: true,
      result: questionsWithResults,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});




export default router;
