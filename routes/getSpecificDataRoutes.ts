import express from "express";
import { Course } from "../schemas/courseSchema";
import { Class } from "../schemas/classSchema";
import { Subject, ISubject } from "../schemas/subjectSchema";
import { Chapter } from "../schemas/chapterSchema";
import { filterClassesByYears } from "../controllers/classController";
import { getClassesByCourseAndYear } from "../controllers/classController";
import { getYearsByCourse } from "../controllers/classController";
import User, { IUser } from "../schemas/userSchema";
import { ResultsByChapter } from "../schemas/resultsByChapterSchema";
import { Request, Response } from "express";
import { getCoursesController } from "../controllers/classController";

const router = express.Router();

// Get courses for a specific university
router.get("/universities/:universityId/courses", async (req, res) => {
  try {
    const universityId = req.params.universityId;
    const courses = await Course.find({ university_ref: universityId });
    if (!courses || courses.length === 0) {
      return res.status(404).send("Courses not found for this university");
    }
    res.send(courses);
  } catch (error) {
    console.error("Error fetching courses for university:", error);
    res.status(500).send("Error fetching courses for university");
  }
});

// Get classes for a specific course
router.get("/courses/:courseId/classes", async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const classes = await Class.find({ course_ref: courseId });
    if (!classes || classes.length === 0) {
      return res.status(404).send("Classes not found for this course");
    }
    res.send(classes);
  } catch (error) {
    console.error("Error fetching classes for course:", error);
    res.status(500).send("Error fetching classes for course");
  }
});

// Get subjects for a specific class
router.get("/classes/:classId/subjects", async (req, res) => {
  try {
    const classId = req.params.classId;
    const subjects = await Subject.find({ class_ref: classId });
    if (!subjects || subjects.length === 0) {
      return res.status(404).send("Subjects not found for this class");
    }
    res.send(subjects);
  } catch (error) {
    console.error("Error fetching subjects for class:", error);
    res.status(500).send("Error fetching subjects for class");
  }
});

// Get chapters for a specific subject
router.get("/subjects/:subjectId/chapters", async (req, res) => {
  try {
    const subjectId = req.params.subjectId;
    const chapters = await Chapter.find({ subject_ref: subjectId });
    if (!chapters || chapters.length === 0) {
      return res.status(404).send("Chapters not found for this subject");
    }
    res.send(chapters);
  } catch (error) {
    console.error("Error fetching chapters for subject:", error);
    res.status(500).send("Error fetching chapters for subject");
  }
});

// Get questions for a specific chapter
router.get("/chapters/:chapterIds/questions", async (req, res) => {
  try {
    const chapterIdsParam = req.params.chapterIds;

    if (!chapterIdsParam) {
      return res.status(400).send("Missing chapters parameter");
    }

    const chapterIds = chapterIdsParam.split(",");

    const chapters = await Chapter.find({ _id: { $in: chapterIds } })
      .populate({
        path: "subject_ref",
        model: "Subject",
        select: "subject_name _id",
      })
      .populate("questions_ref");

    if (!chapters || chapters.length === 0) {
      return res.status(404).send("Chapters not found");
    }

    const responseData: any = chapters.map((chapter) => ({
      _id: chapter._id,
      subject_id: (chapter.subject_ref as ISubject)._id,
      subject_name: (chapter.subject_ref as ISubject).subject_name,
      chapter_name: chapter.chapter_name,
      questions: chapter.questions_ref,
    }));

    res.send(responseData);
  } catch (error) {
    console.error("Error fetching chapters and questions:", error);
    res.status(500).send("Error fetching chapters and questions");
  }
});


router.get("/chapters/:chapterIds/questions/exam", async (req, res) => {
  try {
    const chapterIdsParam = req.params.chapterIds;

    if (!chapterIdsParam) {
      return res.status(400).send("Missing chapters parameter");
    }

    const chapterIds = chapterIdsParam.split(",");

    // Fetch the chapters and questions
    const chapters = await Chapter.find({ _id: { $in: chapterIds } })
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
    const shuffleArray = (array:any) => {
      let currentIndex = array.length,
        randomIndex;
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
    const responseData = chapters.map((chapter:any) => ({
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
  } catch (error) {
    console.error("Error fetching chapters and questions:", error);
    res.status(500).send("Error fetching chapters and questions");
  }
});


// Get years from a class
router.get("/classes/filter-by-years", filterClassesByYears);

// Get classes by course ID and year
router.get(
  "/classes/by-course-and-year/:courseId/:year",
  getClassesByCourseAndYear
);

// Get years by a course
router.get("/classes/years-by-course/:courseId", getYearsByCourse);

// Get classes with subjects, chapters, and grades based on user role
router.get("/:userId/classes", async (req: Request, res: Response) => {
  const userId = req.params.userId;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userRole = user.role;
    let query: any = {};

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

    const classes = await Class.find(query)
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
      const resultsByChapter = await ResultsByChapter.find({
        class_ref: classObj._id,
      });

      const subjectsWithGrades = await Promise.all(
        classObj.subjects_ref.map(async (subject: any) => {
          const subjectObj = subject.toObject ? subject.toObject() : subject;
          const chaptersWithGrades = await Promise.all(
            subjectObj.chapters_ref.map(async (chapter: any) => {
              const chapterObj = chapter.toObject
                ? chapter.toObject()
                : chapter;
              const resultByChapter = resultsByChapter.find((result) =>
                result.chapter_ref.equals(chapterObj._id)
              );

              let questions_done: string | number = "";
              if (resultByChapter && resultByChapter.questions_done) {
                questions_done = resultByChapter.questions_done;
              } else if (
                chapter.results_by_question_ref &&
                chapter.results_by_question_ref.length > 0
              ) {
                questions_done =
                  chapter.results_by_question_ref[0].questions_done;
              }

              return {
                ...chapterObj,
                questions_done: questions_done,
              };
            })
          );

          return {
            ...subjectObj,
            chapters_ref: chaptersWithGrades,
          };
        })
      );

      classesWithGrades.push({
        ...classObj,
        subjects_ref: subjectsWithGrades,
      });
    }

    res.json(classesWithGrades);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});

// Get courses for dashboard
router.get("/courses/:userId", getCoursesController);

export default router;
