import express, { Request, Response } from 'express';
import User from '../schemas/userSchema';
import University from '../schemas/universitySchema';
import { Course, ICourse } from '../schemas/courseSchema'; 
import { Class} from '../schemas/classSchema'; 
import { Chapter } from '../schemas/chapterSchema';
import { Subject } from '../schemas/subjectSchema';
import Question from '../schemas/questionSchema';

const router = express.Router();

// Get all universities
router.get('/universities', async (req: Request, res: Response) => {
    try {
      const universities = await University.find().populate({
        path: 'courses_ref',
        select: 'course_name'
      });
      const formattedUniversities = universities.map(university => ({
        _id: university._id,
        university_name: university.university_name,
        courses_ref: university.courses_ref.map((course: any) => course.course_name)
      }));
  
      res.status(200).send(formattedUniversities);
    } catch (error) {
      console.error('Error fetching universities:', error);
      res.status(500).send('Error fetching universities');
    }
  });

// Get all courses
router.get('/courses', async (req: Request, res: Response) => {
    try {
      const courses = await Course.aggregate([
        {
          $lookup: {
            from: 'universities', 
            localField: 'university_ref',
            foreignField: '_id',
            as: 'university'
          }
        },
        {
          $unwind: { path: '$university', preserveNullAndEmptyArrays: true } 
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'classes_ref',
            foreignField: '_id',
            as: 'classes'
          }
        },
        {
          $unwind: { path: '$classes', preserveNullAndEmptyArrays: true } 
        },
        {
          $group: {
            _id: '$_id',
            course_name: { $first: '$course_name' },
            university_name: { $first: '$university.university_name' },
            classes: { $push: '$classes.class_name' } 
          }
        },
        {
          $project: {
            _id: 1,
            course_name: 1,
            university_name: 1,
            classes: 1
          }
        }
      ]);
      res.status(200).send(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).send('Error fetching courses');
    }
  });
  
// Get all classes
router.get('/classes', async (req: Request, res: Response) => {
    try {
      const classes = await Class.aggregate([
        {
          $lookup: {
            from: 'universities', 
            localField: 'university_ref',
            foreignField: '_id',
            as: 'university'
          }
        },
        {
          $unwind: { path: '$university', preserveNullAndEmptyArrays: true } 
        },
        {
          $lookup: {
            from: 'courses', 
            localField: 'course_ref',
            foreignField: '_id',
            as: 'course'
          }
        },
        {
          $unwind: { path: '$course', preserveNullAndEmptyArrays: true }
        },
        {
          $lookup: {
            from: 'subjects', 
            localField: 'subjects_ref',
            foreignField: '_id',
            as: 'subjects'
          }
        },
        {
          $unwind: { path: '$subjects', preserveNullAndEmptyArrays: true }
        },
        {
          $lookup: {
            from: 'users', 
            localField: 'users_ref',
            foreignField: '_id',
            as: 'users'
          }
        },
        {
          $unwind: {
            path: '$users',
            preserveNullAndEmptyArrays: true 
          }
        },
        {
          $group: {
            _id: '$_id',
            class_name: { $first: '$class_name' },
            year_of_beginning: { $first: '$year_of_beginning' },
            university_name: { $first: '$university.university_name' },
            course_name: { $first: '$course.course_name' },
            subjects: { $addToSet: '$subjects.subject_name' },
            users: { 
              $addToSet: { 
                $concat: [ '$users.first_name', ' ', '$users.last_name' ]
              } 
            } 
          }
        },
        {
          $project: {
            _id: 1,
            class_name: 1,
            year_of_beginning: 1,
            university_name: 1,
            course_name: 1,
            subjects: 1, 
            users: 1    
          }
        }
      ]);
      res.status(200).send(classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
      res.status(500).send('Error fetching classes');
    }
  });

// Get all subjects
router.get('/subjects', async (req: Request, res: Response) => {
    try {
      const subjects = await Subject.aggregate([
        {
          $lookup: {
            from: 'chapters', 
            localField: 'chapters_ref',
            foreignField: '_id',
            as: 'chapters'
          }
        },
        {
          $unwind: {
            path: '$chapters',
            preserveNullAndEmptyArrays: true 
          }
        },
        {
          $lookup: {
            from: 'universities', 
            localField: 'university_ref',
            foreignField: '_id',
            as: 'university'
          }
        },
        {
          $unwind: {
            path: '$university',
            preserveNullAndEmptyArrays: true 
          }
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'class_ref',
            foreignField: '_id',
            as: 'class'
          }
        },
        {
          $unwind: {
            path: '$class',
            preserveNullAndEmptyArrays: true 
          }
        },
        {
          $group: {
            _id: '$_id',
            subject_name: { $first: '$subject_name' },
            university_name: { $first: '$university.university_name' },
            class_name: { $first: '$class.class_name' },
            chapters: { 
              $addToSet: '$chapters.chapter_name'  
            }
          }
        },
        {
          $project: {
            _id: 1,  
            subject_name: 1,
            university_name: 1,  
            class_name: 1,  
            chapters: 1  
          }
        }
      ]);
      res.status(200).send(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).send('Error fetching subjects');
    }
  });

// Get all chapters
router.get('/chapters', async (req: Request, res: Response) => {
    try {
      const chapters = await Chapter.aggregate([
        {
          $lookup: {
            from: 'universities',
            localField: 'university_ref',
            foreignField: '_id',
            as: 'university'
          }
        },
        {
          $unwind: {
            path: '$university',
            preserveNullAndEmptyArrays: true 
          }
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'class_ref',
            foreignField: '_id',
            as: 'class'
          }
        },
        {
          $unwind: {
            path: '$class',
            preserveNullAndEmptyArrays: true 
          }
        },
        {
          $lookup: {
            from: 'subjects', 
            localField: 'subject_ref',
            foreignField: '_id',
            as: 'subject'
          }
        },
        {
          $unwind: {
            path: '$subject',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1, 
            chapter_name: 1,
            is_available: 1,
            number_of_questions: 1,
            university_name: '$university.university_name', 
            class_name: '$class.class_name', 
            subject_name: '$subject.subject_name'  
          }
        }
      ]);
  
      res.status(200).send(chapters);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      res.status(500).send('Error fetching chapters');
    }
  });

// Get all questions
router.get('/questions', async (req: Request, res: Response) => {
    const filterQueries = req.query; 
  
    const matchConditions: any = {};
    Object.keys(filterQueries).forEach((key) => {
      if (key !== 'filter') {
        matchConditions[key] = { $regex: new RegExp(filterQueries[key] as string, 'i') };
      }
    });
  
    try {
      const questions = await Question.aggregate([
        {
          $lookup: {
            from: 'chapters',
            localField: 'chapter_ref',
            foreignField: '_id',
            as: 'chapter'
          }
        },
        {
          $unwind: {
            path: '$chapter',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: matchConditions
        },
        {
          $project: {
            _id: 1,
            chapter_name: '$chapter.chapter_name',
            q_number: 1,
            book_author: 1,
            book_name: 1,
            q_latex_content: 1
          }
        }
      ]);
  
      res.json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'An error occurred while fetching questions.' });
    }
  });

// Get all users
router.get('/users', async (req: Request, res: Response) => {
    try {
      const users = await User.aggregate([
        {
          $lookup: {
            from: 'universities',
            localField: 'university_ref',
            foreignField: '_id',
            as: 'university'
          }
        },
        {
          $unwind: { path: '$university', preserveNullAndEmptyArrays: true }
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'classes_ref',
            foreignField: '_id',
            as: 'classes'
          }
        },
        {
          $unwind: { path: '$classes', preserveNullAndEmptyArrays: true }
        },
        {
          $group: {
            _id: '$_id',
            user_id: { $first: '$_id' },
            first_name: { $first: '$first_name' },
            last_name: { $first: '$last_name' },
            email: { $first: '$email' },
            role: { $first: '$role' },
            university_name: { $first: '$university.university_name' },
            classes: { $addToSet: '$classes.class_name' }
          }
        },
        {
          $project: {
            _id: 1,  
            first_name: 1,
            last_name: 1,
            email: 1,
            role: 1,
            university_name: 1,
            classes: 1
          }
        }
      ]);
  
      res.status(200).send(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Error fetching users');
    }
});
  

router.get('/teachers/:university_id', async (req, res) => {
  const university_id = req.params.university_id;
  console.log("😀😀😀😀",university_id);
  try {
    const user = await User.findOne({ university_ref: university_id, role: "teacher" });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ result: user })
  } catch (error) {
          console.error("Error fetching users:", error);
          res.status(500).send("Error fetching users");
  }
})

export default router;
