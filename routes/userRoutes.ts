import express from 'express';
import mongoose from 'mongoose';
import { updateUserController} from '../controllers/userController';
import { getUserByIdController } from '../controllers/userController';

const router = express.Router();

// Update a specific user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send('Invalid user ID');
  }

  try {
    await updateUserController(req, res);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).send('An unexpected error occurred while updating the user profile. Please try again later.');
  }
});

// New route for fetching user info by ID
router.get('/user-name/:id', getUserByIdController);

export default router;