import { Request, Response } from "express";
import User from "../schemas/userSchema";
import bcrypt from "bcryptjs";
import jwt, { Secret } from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { IUser } from "../schemas/userSchema";
import { Class } from "../schemas/classSchema";
import University from "../schemas/universitySchema";
import { Course } from "../schemas/courseSchema";
import { Subject } from "../schemas/subjectSchema";
import { Chapter } from "../schemas/chapterSchema";
import Question from "../schemas/questionSchema";

const generateSecretKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

const JWT_SECRET: Secret = process.env.JWT_SECRET || generateSecretKey();

export const createUserController = async (req: Request, res: Response) => {
  try {
    const usersData = req.body;
    if (!Array.isArray(usersData) || usersData.length === 0) {
      return res.status(400).json({ message: "Invalid user data provided" });
    }
    const createdUsers: IUser[] = [];
    const tokens: string[] = [];
    for (const userData of usersData) {
      const {
        first_name,
        last_name,
        email,
        password,
        role,
        university_ref,
        classes_ref,
      } = userData;
      if (
        !first_name ||
        !last_name ||
        !email ||
        !password ||
        !role ||
        !university_ref ||
        !Array.isArray(classes_ref)
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: `Email '${email}' is already registered` });
      }
      let universities, courses, classes, subjects, chapters, questions;
      if (role === "admin") {
        universities = await University.find();
        courses = await Course.find();
        classes = await Class.find({ university_ref })
          .populate("course_ref")
          .populate("subjects_ref")
          .populate("users_ref");
        subjects = await Subject.find();
        chapters = await Chapter.find();
        questions = await Question.find();
      } else if (role === "teacher") {
        universities = await University.findById(university_ref);
        courses = await Course.find({ university_ref });
        classes = await Class.find({ university_ref })
          .populate("course_ref")
          .populate("subjects_ref")
          .populate("users_ref");
        subjects = await Subject.find({ university_ref });
        chapters = await Chapter.find({ university_ref });
        questions = await Question.find({ university_ref });
      }
      const newUser: IUser = new User({
        first_name,
        last_name,
        email,
        passwordHashed: password,
        role,
        university_ref,
        classes_ref,
        quizzes_ref: [],
      });
      await newUser.save();
      createdUsers.push(newUser);
      const token = jwt.sign(
        { _id: newUser._id, role: newUser.role },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      tokens.push(token);
      await Class.updateMany(
        { _id: { $in: classes_ref } },
        { $push: { users_ref: newUser._id } }
      );
    }
    return res.status(201).json({ users: createdUsers, tokens });
  } catch (error) {
    console.error("Error adding users:", error);
    return res
      .status(500)
      .json({ message: "Error adding users. Please try again." });
  }
};

export const updateUserController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send("Invalid user ID");
    }
    const { first_name, last_name, newPassword, email, total_question_done } =
      req.body;
    const updateData: any = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    // if (total_question_done) updateData.total_question_done = total_question_done;
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.passwordHashed = hashedPassword;
    }

    if (email) updateData.email = email;
    console.log(
      "total_question_done_before",
      total_question_done,
      updateData.total_question_done
    );
    // Handle the increment for total_question_done
    if (total_question_done) {
      const user = await User.findById(id);
      if (user && user.total_question_done) {
        console.log("Update it Exiting");
        updateData.total_question_done = user.total_question_done + 1;
      } else {
        console.log("Update it with ONE");
        updateData.total_question_done = 1;
      }
    }
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (updatedUser) {
      res.status(200).json(updatedUser);
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Error updating user");
  }
};

// Get user's full name by ID
export const getUserByIdController = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await User.findById(userId).select(
      "first_name last_name role total_question_done"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      firstName: user.first_name,
      lastName: user.last_name,
      total_question_done: user.total_question_done || 0,
    });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
