import { Request, Response } from "express";
import { Class, IClass } from "../schemas/classSchema";
import User from "../schemas/userSchema";
import { Course } from "../schemas/courseSchema";

const filterClassesByYears = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { years } = req.query;

  if (!years || !Array.isArray(years)) {
    res.status(400).json({ message: "Please provide a valid array of years." });
    return;
  }
  try {
    const yearNumbers = (years as string[])
      .map((year) => parseInt(year, 10))
      .filter((year) => !isNaN(year));
    const classes = await Class.find({
      year_of_beginning: { $in: yearNumbers },
    });

    res.status(200).json(classes);
  } catch (error) {
    console.error("Error filtering classes:", error);
    res
      .status(500)
      .json({ message: "An error occurred while filtering classes." });
  }
};

const getYearsByCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      res.status(400).json({ message: "Course ID is required." });
      return;
    }
    const classes = await Class.find({ course_ref: courseId });
    const years = Array.from(
      new Set(classes.map((cls) => cls.year_of_beginning))
    );
    res.status(200).json(years);
  } catch (error) {
    console.error("Error fetching years by course:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching years by course." });
  }
};

const getClassesByCourseAndYear = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { courseId, year } = req.params;
    if (!courseId || !year) {
      res.status(400).json({ message: "Course ID and year are required." });
      return;
    }
    const classes = await Class.find({
      course_ref: courseId,
      year_of_beginning: parseInt(year),
    });
    res.status(200).json(classes);
  } catch (error) {
    console.error("Error fetching classes for course and year:", error);
    res.status(500).json({
      message: "An error occurred while fetching classes for course and year.",
    });
  }
};

const getCoursesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).populate("classes_ref");
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      res.status(404).json({ message: "User not found" });
      return;
    }

    let courses;

    if (user.role === "admin") {
      courses = await Course.find();
    } else if (user.role === "teacher" && user.university_ref) {
      // Fetch courses associated with the teacher's university
      courses = await Course.find({
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
    } else {
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
  } catch (error) {
    console.error("Error fetching courses:", error);
    res
      .status(500)
      .json({ message: "Error fetching courses. Please try again." });
  }
};

export {
  filterClassesByYears,
  getClassesByCourseAndYear,
  getYearsByCourse,
  getCoursesController,
};
