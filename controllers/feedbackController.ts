// controllers/feedbackController.ts
import { Request, Response } from "express";
import Feedback from "../schemas/FeedbackSchema";

// Create new feedback
export const createFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, category, message } = req.body;

    // Check if required fields are present
    if (!userId || !category || !message) {
      res
        .status(400)
        .json({ message: "User ID, category, and message are required." });
      return;
    }

    const feedback = new Feedback({ userId, category, message });
    await feedback.save();

    res
      .status(201)
      .json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    console.error("Error creating feedback:", error);
    res
      .status(500)
      .json({ message: "An error occurred while submitting feedback." });
  }
};


export const getFeedbackByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page if not provided

    if (!category) {
      res.status(400).json({ message: "Category is required." });
      return;
    }

    const totalFeedbacks = await Feedback.countDocuments({ category });
    const feedbacks = await Feedback.find({ category })
      .skip((page - 1) * limit) // Calculate the number of items to skip
      .limit(limit); // Limit the number of items returned

    res.status(200).json({
      feedbacks,
      totalFeedbacks,
      totalPages: Math.ceil(totalFeedbacks / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching feedback by category:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching feedback." });
  }
};

