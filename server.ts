import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

import authRoutes from './routes/authRoutes';
import addDataRoutes from './routes/addDataRoutes';
import getAllDataRoutes from './routes/getAllDataRoutes';
import getSpecificDataRoutes from './routes/getSpecificDataRoutes';
import deleteDataRoutes from './routes/deleteDataRoutes';
import searchRoutes from './routes/searchRoutes';
import userRoutes from './routes/userRoutes';
import quizRoutes from './routes/quizRoutes';
import teacherRoutes from './routes/teacherRoutes';
import adminRoutes from './routes/adminRoutes';
import testing1 from "./routes/testing";
import { createFeedback, getFeedbackByCategory } from "./controllers/feedbackController";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

app.use(bodyParser.json({ limit: '50mb' }));

app.post('/upload-image-url', async (req: Request, res: Response) => {
  const { imageUrl } = req.body;

  if (!imageUrl || !imageUrl.startsWith('data:image/') || !imageUrl.includes('base64,')) {
    return res.status(400).json({ error: 'Valid Base64 image URL is required' });
  }
  try {
    const base64Data = imageUrl.split('base64,')[1];
    if (!base64Data) {
      throw new Error('Base64 data is missing');
    }
    const buffer = Buffer.from(base64Data, 'base64');
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: 'image', public_id: 'image_url' }, (error, result) => {
      resolve(result);
      }).end(buffer);
    });
    return res.status(200).json({ url: result.secure_url });
  } catch (error: any) {
  }
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://dojo-v1.netlify.app",
  process.env.FE_API,
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

mongoose.connect(process.env.MONGO_URI as string)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err.message);
    });


app.use("/api/testing", testing1);
app.use('/api/auth', authRoutes);
app.use('/api/add', addDataRoutes);
app.use('/api/delete', deleteDataRoutes);
app.use('/api/getall', getAllDataRoutes);
app.use('/api/getspecific', getSpecificDataRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/user', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/feedback/create", createFeedback);
app.use("/api/feedback/get/:category", getFeedbackByCategory);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Oops! Something unexpected happened. Please try again later.');
});


app.get('/', (req: Request, res: Response) => {
    res.send('Server is running...');
});


const PORT = process.env.PORT || 3005;  


const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
