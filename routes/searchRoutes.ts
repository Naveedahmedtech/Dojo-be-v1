import express, { Request, Response } from 'express';
import { Chapter } from '../schemas/chapterSchema';
import { Class } from '../schemas/classSchema';
import { IUser } from '../schemas/userSchema';
import University from '../schemas/universitySchema';
import User from '../schemas/userSchema';
const router = express.Router();

// Get chapters for HomePage
router.get('/chapters', async (req: Request, res: Response) => {
  const { query } = req.query;
  try {
    if (!query) {
      return res.status(400).json({ error: 'Please provide a search query' });
    }
    const chapters = await Chapter.find({ chapter_name: { $regex: new RegExp(query as string, 'i') } });
    res.json(chapters);
  } catch (error) {
    console.error('Error searching chapters:', error);
    res.status(500).json({ error: 'Error searching chapters' });
  }
});

// Users' search
router.get('/users', async (req: Request, res: Response) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  try {
    const users = await User.find({
      $and: [
        {
          $or: [
            { first_name: { $regex: new RegExp(name as string, 'i') } },
            { last_name: { $regex: new RegExp(name as string, 'i') } },
          ]
        },
        {
          role: { $nin: ['admin', 'teacher'] } 
        }
      ]
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});


export default router;