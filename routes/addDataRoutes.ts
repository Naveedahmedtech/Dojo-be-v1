import express, { Request, Response } from 'express';
import University from '../schemas/universitySchema';
import { Course } from '../schemas/courseSchema';
import { Class }from '../schemas/classSchema';
import { Subject } from '../schemas/subjectSchema';
import { Chapter } from '../schemas/chapterSchema';
import { Types } from 'mongoose';
import { createUserController } from '../controllers/userController';
import Question, {IQuestion, IQuestionOption} from '../schemas/questionSchema';
import { decodeBase64 } from '../utils/decodeBase64';
import User from '../schemas/userSchema';

const mongoose = require('mongoose');

const router = express.Router();

const toObjectId = (id: string): Types.ObjectId => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId');
    }
    return new Types.ObjectId(id);
};

// Add a new university
router.post('/universities', async (req: Request, res: Response) => {
    try {
        const { university_name } = req.body;
        if (!university_name) {
            return res.status(400).send('University name is required.');
        }

        const existingUniversity = await University.findOne({ university_name });
        if (existingUniversity) {
            return res.status(400).send('University already exists.');
        }

        const university = new University({ university_name });
        await university.save();
        await university.populate('courses_ref');
        res.status(201).json({
            message: 'University created successfully.',
            university: university
        });
    } catch (error) {
        console.error('Error creating university:', error);
        res.status(500).send('Error creating university.');
    }
});

// Add a new course
router.post('/courses', async (req: Request, res: Response) => {
    try {
        const { university_ref, course_name, classes_ref } = req.body;
        if (!university_ref || !course_name) {
            return res.status(400).json({ message: 'University ID and course name are required.' });
        }
        let universityRef: Types.ObjectId;
        try {
            universityRef = toObjectId(university_ref);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid University ID.' });
        }
        const university = await University.findById(universityRef);
        if (!university) {
            return res.status(404).json({ message: 'University not found.' });
        }
        const course = new Course({
            university_ref: universityRef,
            course_name,
            classes_ref: classes_ref || []
        });
        await course.save();
        university.courses_ref.push(course._id);
        await university.save();
        const adminUniversity = await University.findOne({ university_name: 'admin' });
        if (adminUniversity) {
            adminUniversity.courses_ref.push(course._id);
            await adminUniversity.save();
        } else {
            console.warn('Admin university not found.');
        }
        res.status(201).json({
            message: 'Course created successfully.',
            course
        });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Error creating course.' });
    }
});

// Add a new class
router.post('/classes', async (req: Request, res: Response) => {
    try {
        const { university_ref, course_ref, year_of_beginning, class_name, subjects_ref, users_ref } = req.body;
        if (!university_ref || !course_ref || !year_of_beginning || !class_name) {
            return res.status(400).send('University ID, Course ID, year of beginning, and class name are required.');
        }
        const universityRef = toObjectId(university_ref);
        const courseRef = toObjectId(course_ref);
        const university = await University.findById(universityRef);
        if (!university) {
            return res.status(404).send('University not found.');
        }
        const course = await Course.findById(courseRef);
        if (!course) {
            return res.status(404).send('Course not found.');
        }
        const newClass = new Class({
            university_ref: universityRef,
            course_ref: courseRef,
            year_of_beginning,
            class_name,
            subjects_ref: subjects_ref || [],
            users_ref: users_ref || []
        });
        await newClass.save();
        course.classes_ref.push(newClass._id);
        await course.save();
        await User.updateMany(
            { role: 'admin' },
            { $push: { classes_ref: newClass._id } }
        );
        res.status(201).send('Class created successfully and added to admin users.');
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).send('Error creating class.');
    }
});


// Add a new subject
router.post('/subjects', async (req, res) => {
    try {
        const { university_ref, class_ref, subject_name, subject_icon_url } = req.body;
        if (!university_ref || !class_ref || !subject_name || !subject_icon_url) {
            return res.status(400).json({ message: 'University ID, class ID, subject name, and subject icon URL are required.' });
        }
        const universityRef = new mongoose.Types.ObjectId(university_ref);
        const university = await University.findById(universityRef);
        if (!university) {
            return res.status(404).json({ message: 'University not found.' });
        }
        const classRef = new mongoose.Types.ObjectId(class_ref);
        const classObj = await Class.findById(classRef);
        if (!classObj) {
            return res.status(404).json({ message: 'Class not found.' });
        }
        const subject = new Subject({
            university_ref: universityRef,
            class_ref: classRef,
            subject_name,
            subject_icon_url,
            chapters_ref: [] 
        });
        const savedSubject = await subject.save();
        classObj.subjects_ref.push(savedSubject);
        await classObj.save();

        return res.status(201).json({ message: 'Subject created successfully.', subject: savedSubject });
    } catch (error) {
        console.error('Error creating subject:', error);
        return res.status(500).json({ message: 'Error creating subject.' });
    }
});


// Add a new chapter
router.post('/chapters', async (req, res) => {
    try {
        const { subject_ref, chapter_name, is_available = true } = req.body;

        if (!subject_ref || !chapter_name) {
            return res.status(400).json({ message: 'Subject ID and chapter name are required.' });
        }

        const subject = await Subject.findById(subject_ref);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found.' });
        }
        const universityRef = new mongoose.Types.ObjectId(subject.university_ref);
        const university = await University.findById(universityRef);
        if (!university) {
            return res.status(404).json({ message: 'University not found.' });
        }
        const classRef = new mongoose.Types.ObjectId(subject.class_ref);
        const classObj = await Class.findById(classRef);
        if (!classObj) {
            return res.status(404).json({ message: 'Class not found.' });
        }
        const chapter = new Chapter({
            university_ref: universityRef,
            class_ref: classRef,
            subject_ref: subject_ref,
            chapter_name: chapter_name,
            is_available: is_available,
            number_of_questions: 0,
            questions_ref: []
        });

        const savedChapter = await chapter.save();
        subject.chapters_ref.push(savedChapter);
        await subject.save();

        return res.status(201).json({ message: 'Chapter created successfully.', chapter: savedChapter });
    } catch (error) {
        console.error('Error creating chapter:', error);
        return res.status(500).json({ message: 'Error creating chapter.' });
    }
});

// Add new question
router.post('/questions', async (req: Request, res: Response) => {
    try {
      const { chapter_ref, parsedData } = req.body;
      if (!mongoose.Types.ObjectId.isValid(chapter_ref)) {
        return res.status(400).json({ message: 'Invalid chapter reference' });
      }
      parsedData.sort((a: any, b: any) => a.q_number - b.q_number);
      const formattedQuestions: IQuestion[] = await Promise.all(
        parsedData.map(async (questionData: any) => {
            const options: IQuestionOption[] = [];
            if (questionData.q_answertype_options) {
              for (let i = 0; i < questionData.q_answertype_options.length; i++) {
                const option = questionData.q_answertype_options[i];
                let imageUrl = '';
                try {
                  if (option.image_url) {
                    imageUrl = await decodeBase64(option.image_url, `option-${questionData.q_number}-${i}.png`);
                  }
                } catch (error) {
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
                imageUrl = await decodeBase64(questionData.q_image_url, `question-${questionData.q_number}.png`);
              }
            } catch (error) {
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
            } as IQuestion;
          })
      );
  
      const insertedQuestions = await Question.insertMany(formattedQuestions);
  
      const chapter = await Chapter.findByIdAndUpdate(
        chapter_ref,
        { $push: { questions_ref: { $each: insertedQuestions.map(q => q._id) } } },
        { new: true }
      );
  
      if (chapter) {
        chapter.number_of_questions = chapter.questions_ref.length;
        await chapter.save();
      }
  
      res.status(200).json({ message: 'Questions saved successfully' });
  
    } catch (error) {
      console.error('Error saving questions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// Add a new user
router.post('/users', createUserController);

export default router;
