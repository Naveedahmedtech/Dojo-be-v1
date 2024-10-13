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
const express_1 = __importDefault(require("express"));
const chapterSchema_1 = require("../schemas/chapterSchema");
const userSchema_1 = __importDefault(require("../schemas/userSchema"));
const router = express_1.default.Router();
// Get chapters for HomePage
router.get('/chapters', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req.query;
    try {
        if (!query) {
            return res.status(400).json({ error: 'Please provide a search query' });
        }
        const chapters = yield chapterSchema_1.Chapter.find({ chapter_name: { $regex: new RegExp(query, 'i') } });
        res.json(chapters);
    }
    catch (error) {
        console.error('Error searching chapters:', error);
        res.status(500).json({ error: 'Error searching chapters' });
    }
}));
// Users' search
router.get('/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    try {
        const users = yield userSchema_1.default.find({
            $and: [
                {
                    $or: [
                        { first_name: { $regex: new RegExp(name, 'i') } },
                        { last_name: { $regex: new RegExp(name, 'i') } },
                    ]
                },
                {
                    role: { $nin: ['admin', 'teacher'] }
                }
            ]
        });
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
}));
exports.default = router;
