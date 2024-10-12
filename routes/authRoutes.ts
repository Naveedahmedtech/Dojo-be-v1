import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../schemas/userSchema';
import { IUniversity } from '../schemas/universitySchema';
import { IClass } from '../schemas/classSchema';
import nodemailer, { SendMailOptions } from 'nodemailer';
import University from '../schemas/universitySchema';
import { Course, ICourse } from '../schemas/courseSchema';
import { Class } from '../schemas/classSchema';
import { Subject } from '../schemas/subjectSchema';
import { Chapter } from '../schemas/chapterSchema';
import Question from '../schemas/questionSchema';

const router = express.Router();
const FE_API = process.env.FE_API;

const generateSecretKey = () => crypto.randomBytes(32).toString('hex');
const JWT_SECRET: string = process.env.JWT_SECRET || generateSecretKey();


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email })
      .populate({
        path: "university_ref",
        select: "university_name",
      })
      .populate({
        path: "classes_ref",
        select: "class_name year_of_beginning subjects_ref course_ref",
        populate: [
          {
            path: "course_ref",
            select: "course_name",
          },
          {
            path: "subjects_ref",
            select: "subject_name chapters_ref subject_icon_url _id",
            populate: {
              path: "chapters_ref",
              select: "chapter_name _id",
              match: { is_available: true },
              populate: {
                path: "questions_ref",
                select: "question_text options",
              },
            },
          },
        ],
      });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHashed);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    let university_name: string = "Unknown";
    if (user?.university_ref) {
      university_name = (user.university_ref as IUniversity).university_name;
    }

    const class_info: any[] = [];
    if (user?.classes_ref) {
      (user.classes_ref as IClass[]).forEach((classRef: IClass) => {
        const course_name =
          (classRef.course_ref as ICourse)?.course_name ?? "Unknown";
        const subjects_info =
          classRef.subjects_ref?.map((subjectRef: any) => ({
            subject_id: subjectRef._id,
            subject_name: subjectRef.subject_name,
            subject_icon_url: subjectRef.subject_icon_url,
            chapters: subjectRef.chapters_ref?.map((chapterRef: any) => ({
              _id: chapterRef._id,
              chapter_name: chapterRef.chapter_name,
              questions: chapterRef.questions_ref?.map((questionRef: any) => ({
                question_text: questionRef.question_text,
                options: questionRef.options,
              })),
            })),
          })) ?? [];
        class_info.push({
          class_name: classRef.class_name,
          year_of_beginning: classRef.year_of_beginning,
          course_name,
          subjects: subjects_info,
        });
      });
    }

    let universities: any[] = [];
    let courses: any[] = [];
    let classes: any[] = [];
    let subjects: any[] = [];
    let chapters: any[] = [];
    let questions: any[] = [];

    if (user?.role === "admin") {
      universities = await University.find();
      courses = await Course.find();
      classes = await Class.find({ university_ref: user.university_ref })
        .populate("course_ref")
        .populate({
          path: "subjects_ref",
          populate: {
            path: "chapters_ref",
            match: { is_available: true },
            select: "chapter_name _id",
            populate: {
              path: "questions_ref",
              select: "question_text options",
            },
          },
        })
        .populate("users_ref");
      subjects = await Subject.find();
      chapters = await Chapter.find({ is_available: true });
      questions = await Question.find();
    } else if (user?.role === "teacher") {
      universities = await University.find();
      courses = await Course.find({ university_ref: user.university_ref });
      classes = await Class.find({ university_ref: user.university_ref })
        .populate("course_ref")
        .populate({
          path: "subjects_ref",
          populate: {
            path: "chapters_ref",
            match: { is_available: true },
            select: "chapter_name _id",
            populate: {
              path: "questions_ref",
              select: "question_text options",
            },
          },
        })
        .populate("users_ref");
      subjects = await Subject.find({ university_ref: user.university_ref });
      chapters = await Chapter.find({
        university_ref: user.university_ref,
        is_available: true,
      });
      questions = await Question.find({ university_ref: user.university_ref });
    }

    const userInfo = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      university_name,
      class_info,
      quizzes_ref: user.quizzes_ref,
      universities,
      courses,
      classes,
      subjects,
      chapters,
      questions,
    };

    console.log("userInfo", userInfo);

    const token = jwt.sign({ _id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({ token, userInfo });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Login process was unsuccessful" });
  }
});


// nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 587,
    auth: {
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD,
    },
  });

// Send reset password email
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: `Email '${email}' is not registered` });
      }
      const secret = process.env.JWT_SECRET + user.passwordHashed;
      const payload = {
        email: user.email,
        id: user.id
      };
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      const resetLink = `${FE_API}/auth/reset-password/${user.id}/${token}`;
     console.log(resetLink)
      const senderAddress = `"Thot Reset Password Link" <mailtrap@dojoapp.tech>`;
      const recipientAddress = email;
  
      const mailOptions: SendMailOptions = {
        from: senderAddress,
        to: recipientAddress,
        subject: 'Thot Password Reset Request',
        html: `
            <p>Hello ${user.first_name},</p>
            <p>Please click on the following link to reset your password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>If you did not request this, please ignore this email</p>
        `
      };
      await transporter.sendMail(mailOptions);
      console.log(resetLink);
      res.send('Password reset link has been sent to your email');
    } catch (error) {
      console.error('Error in forgot password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
});

// Render reset password page
  router.get('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        const secret = JWT_SECRET + user.passwordHashed;
        const decoded = jwt.verify(token, secret) as { email: string; id: string };
        if (decoded.email !== user.email) {
            return res.status(400).json({ message: 'Invalid token or expired link' });
        }
        res.render('reset-password', { email: user.email });
    } catch (error: any) {
        console.error('Error in reset password:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
});
  
// Handle reset password form submission
router.post('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;
  
    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      const secret = JWT_SECRET + user.passwordHashed;
      const decoded = jwt.verify(token, secret) as { email: string } | null;
      if (!decoded || typeof decoded !== 'object' || !decoded.email) {
        return res.status(400).json({ message: 'Invalid token or expired link' });
      }
      if (decoded.email !== user.email) {
        return res.status(400).json({ message: 'Invalid token or expired link' });
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user.passwordHashed = hashedPassword;
        await user.save();
      }
      res.json({ message: 'Password reset successful' });
    } catch (error: any) {
      console.error('Error in reset password:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
export default router;
