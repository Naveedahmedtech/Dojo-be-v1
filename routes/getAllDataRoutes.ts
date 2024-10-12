import express, { Request, Response } from 'express';
import User from '../schemas/userSchema';
import University from '../schemas/universitySchema';
import { Course } from '../schemas/courseSchema'; 
import { Class} from '../schemas/classSchema'; 
import { Chapter } from '../schemas/chapterSchema';
import { Subject } from '../schemas/subjectSchema';
import Question from '../schemas/questionSchema';

const router = express.Router();

// Get all universities
router.get('/universities', async (req: Request, res: Response) => {
  try {
    const universities = await University.find();
    res.send(universities);
  } catch (error) {
    console.error('Error fetching universities:', error);
    res.status(500).send('Error fetching universities');
  }
});

// Get all courses
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const courses = await Course.find();
    res.send(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).send('Error fetching courses');
  }
});

// Get all classes
router.get('/classes', async (req: Request, res: Response) => {
  try {
    const classes = await Class.find().populate('course_ref').populate('subjects_ref').populate('users_ref');
    res.send(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).send('Error fetching classes');
  }
});

// Get all subjects
router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const subjects = await Subject.find();
    res.send(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).send('Error fetching subjects');
  }
});

// Get all chapters
router.get('/chapters', async (req: Request, res: Response) => {
  try {
    const chapters = await Chapter.find();
    res.send(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).send('Error fetching chapters');
  }
});

// Get all questions
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const questions = await Question.find();
    res.send(questions); 
  } catch (error) {
    console.error('Error fetching questions:', error); 
    res.status(500).send('Error fetching questions');
  }
});

// Get all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.send(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users');
  }
});

export default router;