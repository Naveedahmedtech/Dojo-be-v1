"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedbackByCategory = exports.createFeedback = void 0;
const FeedbackSchema_1 = __importDefault(require("../schemas/FeedbackSchema"));
// Create new feedback
const createFeedback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, category, message } = req.body;
        // Check if required fields are present
        if (!userId || !category || !message) {
            res
                .status(400)
                .json({ message: "User ID, category, and message are required." });
            return;
        }
        const feedback = new FeedbackSchema_1.default({ userId, category, message });
        yield feedback.save();
        res
            .status(201)
            .json({ message: "Feedback submitted successfully", feedback });
    }
    catch (error) {
        console.error("Error creating feedback:", error);
        res
            .status(500)
            .json({ message: "An error occurred while submitting feedback." });
    }
});
exports.createFeedback = createFeedback;
const getFeedbackByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.params;
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page if not provided
        if (!category) {
            res.status(400).json({ message: "Category is required." });
            return;
        }
        const totalFeedbacks = yield FeedbackSchema_1.default.countDocuments({ category });
        const feedbacks = yield FeedbackSchema_1.default.find({ category })
            .skip((page - 1) * limit) // Calculate the number of items to skip
            .limit(limit); // Limit the number of items returned
        res.status(200).json({
            feedbacks,
            totalFeedbacks,
            totalPages: Math.ceil(totalFeedbacks / limit),
            currentPage: page,
        });
    }
    catch (error) {
        console.error("Error fetching feedback by category:", error);
        res
            .status(500)
            .json({ message: "An error occurred while fetching feedback." });
    }
});
exports.getFeedbackByCategory = getFeedbackByCategory;
