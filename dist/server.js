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
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const cloudinary_1 = require("cloudinary");
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const addDataRoutes_1 = __importDefault(require("./routes/addDataRoutes"));
const getAllDataRoutes_1 = __importDefault(require("./routes/getAllDataRoutes"));
const getSpecificDataRoutes_1 = __importDefault(require("./routes/getSpecificDataRoutes"));
const deleteDataRoutes_1 = __importDefault(require("./routes/deleteDataRoutes"));
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const teacherRoutes_1 = __importDefault(require("./routes/teacherRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(body_parser_1.default.json({ limit: '50mb' }));
app.post('/upload-image-url', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield new Promise((resolve, reject) => {
            cloudinary_1.v2.uploader.upload_stream({ resource_type: 'image', public_id: 'image_url' }, (error, result) => {
                resolve(result);
            }).end(buffer);
        });
        return res.status(200).json({ url: result.secure_url });
    }
    catch (error) {
    }
}));
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', process.env.FE_API];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => {
    console.log('Connected to MongoDB');
})
    .catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
});
app.use('/api/auth', authRoutes_1.default);
app.use('/api/add', addDataRoutes_1.default);
app.use('/api/delete', deleteDataRoutes_1.default);
app.use('/api/getall', getAllDataRoutes_1.default);
app.use('/api/getspecific', getSpecificDataRoutes_1.default);
app.use('/api/search', searchRoutes_1.default);
app.use('/api/user', userRoutes_1.default);
app.use('/api/quiz', quizRoutes_1.default);
app.use('/api/teacher', teacherRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Oops! Something unexpected happened. Please try again later.');
});
app.get('/', (req, res) => {
    res.send('Server is running...');
});
const PORT = process.env.PORT || 3005;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
exports.default = app;
