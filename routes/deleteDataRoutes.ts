import express, { Request, Response } from 'express';
import University from '../schemas/universitySchema';
import { Course } from '../schemas/courseSchema';
import { Class } from '../schemas/classSchema';
import { Subject } from '../schemas/subjectSchema';
import { Chapter } from '../schemas/chapterSchema';
import Question from '../schemas/questionSchema';
import User from '../schemas/userSchema';
import { Types } from 'mongoose';
import { Quiz } from '../schemas/quizSchema';
import { ResultsByChapter } from '../schemas/resultsByChapterSchema';
import { ResultsByQuestion } from '../schemas/resultByQuestionSchema';


const router = express.Router();

const toObjectId = (id: string): Types.ObjectId => {
    try {
        return new Types.ObjectId(id);
    } catch (error) {
        throw new Error('Invalid ObjectId');
    }
};

// Delete a user
router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
        const userId = toObjectId(req.params.id);  
        const user = await User.findById(userId).populate('quizzes_ref').populate('classes_ref');
        if (!user) {
          return res.status(404).send('User not found');
        }
        const quizzes = user.quizzes_ref || [];
        const quizIds = quizzes.map((quiz) => quiz._id);  
        const resultsByChapters = await ResultsByChapter.find({ quiz_ref: { $in: quizIds } });
        const resultsByChapterIds = resultsByChapters.map(result => result._id);
        await ResultsByQuestion.deleteMany({ results_by_chapter_ref: { $in: resultsByChapterIds } });
        await ResultsByChapter.deleteMany({ quiz_ref: { $in: quizIds } });
        await Quiz.deleteMany({ _id: { $in: quizIds } });
        const classIds = user.classes_ref?.map((cls) => cls._id) || [];  
        await Class.updateMany(
          { _id: { $in: classIds } },
          { $pull: { users_ref: userId } }  
        );
        await User.findByIdAndDelete(userId);
        res.status(200).send('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user and associated data:', error);
        res.status(500).send('Error deleting user and associated data');
      }
    });

// Delete a university
router.delete('/universities/:universityId', async (req: Request, res: Response) => {
    try {
        const universityId = req.params.universityId;
        const universityDoc = await University.findById(universityId);
        if (!universityDoc) {
            return res.status(404).send('University not found.');
        }
        const courseIds = universityDoc.courses_ref;
        await Promise.all(courseIds.map(async (courseId) => {
            const courseDoc = await Course.findById(courseId);
            if (courseDoc) {
                const classIds = courseDoc.classes_ref;
                await Promise.all(classIds.map(async (classId) => {
                    const classDoc = await Class.findById(classId);
                    if (classDoc) {
                        const subjectIds = classDoc.subjects_ref;
                        console.log('Subject IDs:', subjectIds);
                        await Promise.all(subjectIds.map(async (subjectId) => {
                            const subjectDoc = await Subject.findById(subjectId);
                            if (subjectDoc) {
                                const chapterIds = subjectDoc.chapters_ref;
                                await Question.deleteMany({ chapter_ref: { $in: chapterIds } });
                                await Promise.all(chapterIds.map(async (chapterId) => {
                                    await Chapter.findByIdAndDelete(chapterId);
                                }));
                                await Subject.findByIdAndDelete(subjectId);
                            }
                        }));
                        await Class.findByIdAndDelete(classId);
                    }
                }));
                await Course.findByIdAndDelete(courseId);
            }
        }));
        await University.findByIdAndDelete(universityId);
        await Course.updateMany(
            { _id: { $in: courseIds } },
            { $pull: { universities_ref: universityId } }
        );
        res.status(200).send('University and all associated courses, classes, subjects, chapters, and questions deleted successfully.');
    } catch (error) {
        console.error('Error deleting university:', error);
        res.status(500).send('Error deleting university.');
    }
});

// Delete a course
router.delete('/courses/:courseId', async (req: Request, res: Response) => {
    try {
        const courseId = req.params.courseId;
        const courseDoc = await Course.findById(courseId);
        if (!courseDoc) {
            return res.status(404).send('Course not found.');
        }
        const classIds = courseDoc.classes_ref;
        for (const classId of classIds) {
            const classDoc = await Class.findById(classId);
            if (classDoc) {
                const subjectIds = classDoc.subjects_ref;
                for (const subjectId of subjectIds) {
                    const subjectDoc = await Subject.findById(subjectId);
                    if (subjectDoc) {
                        const chapterIds = subjectDoc.chapters_ref;
                        for (const chapterId of chapterIds) {
                            await Question.deleteMany({ chapter_ref: chapterId });
                            await Chapter.findByIdAndDelete(chapterId);
                        }
                        await Subject.findByIdAndDelete(subjectId);
                    }
                }
                await Class.findByIdAndDelete(classId);
            }
        }
        const deletedCourse = await Course.findByIdAndDelete(courseId);
        if (!deletedCourse) {
            return res.status(404).send('Course not found.');
        }
        const university = await University.findOneAndUpdate(
            { courses_ref: courseId },
            { $pull: { courses_ref: courseId } }
        );
        if (!university) {
            return res.status(404).send('University not found.');
        }
        res.status(200).send('Course deleted successfully.');
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).send('Error deleting course.');
    }
});

// Delete a class
router.delete('/classes/:classId', async (req: Request, res: Response) => {
    try {
        const classId = req.params.classId;
        let classObjectId: Types.ObjectId;
        try {
            classObjectId = toObjectId(classId);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid Class ID.' });
        }
        const classDoc = await Class.findById(classObjectId).populate('subjects_ref');
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found.' });
        }
        const subjectIds = classDoc.subjects_ref.map(subject => subject._id);
        const subjectChapters = await Subject.find({ _id: { $in: subjectIds } }).select('chapters_ref').lean();
        const chapterIds = subjectChapters.flatMap(subject => subject.chapters_ref);
        await Question.deleteMany({ chapter_ref: { $in: chapterIds } });
        await Chapter.deleteMany({ _id: { $in: chapterIds } });
        await Subject.deleteMany({ _id: { $in: subjectIds } });
        await Class.findByIdAndDelete(classObjectId);
        await Course.findOneAndUpdate(
            { classes_ref: classId },
            { $pull: { classes_ref: classId } },
            { new: true }  
        );
        res.status(200).json({ message: 'Class deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting class.' });
    }
});

// Delete a subject
router.delete('/subjects/:subjectId', async (req: Request, res: Response) => {
    try {
        const subjectId = req.params.subjectId;
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found.' });
        }
        const chapterIds = subject.chapters_ref;
        for (const chapterId of chapterIds) {
            await Question.deleteMany({ chapter_ref: chapterId });
        }
        await Chapter.deleteMany({ _id: { $in: chapterIds } });
        await Subject.findByIdAndDelete(subjectId);
        const classDoc = await Class.findOneAndUpdate(
            { subjects_ref: subjectId },
            { $pull: { subjects_ref: subjectId } }
        );
        if (!classDoc) {
            return res.status(404).json({ message: 'Class not found.' });
        }
        res.status(200).json({ message: 'Subject deleted successfully.' });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ message: 'Error deleting subject.' });
    }
});

// Delete a chapter
router.delete('/chapters/:chapterId', async (req: Request, res: Response) => {
    try {
        const chapterId = req.params.chapterId;
        await Question.deleteMany({ chapter_ref: chapterId });
        const deletedChapter = await Chapter.findByIdAndDelete(chapterId);
        if (!deletedChapter) {
            return res.status(404).json({ message: 'Chapter not found.' });
        }
        const subject = await Subject.findOneAndUpdate(
            { chapters_ref: chapterId },
            { $pull: { chapters_ref: chapterId } }
        );
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found.' });
        }
        res.status(200).json({ message: 'Chapter deleted successfully.' });
    } catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({ message: 'Error deleting chapter.' });
    }
});


// Delete a question
router.delete('/questions/:questionId', async (req: Request, res: Response) => {
    try {
        const questionId = req.params.questionId;
        const deletedQuestion = await Question.findByIdAndDelete(questionId);
        if (!deletedQuestion) {
            return res.status(404).json({ message: 'Question not found.' });
        }
        const chapter = await Chapter.findOneAndUpdate(
            { questions_ref: questionId },
            { $pull: { questions_ref: questionId } },
            { new: true }
        );
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found.' });
        }
        chapter.number_of_questions = chapter.questions_ref.length;
        await chapter.save();

        res.status(200).json({ message: 'Question deleted successfully.' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ message: 'Error deleting question.' });
    }
});

export default router;