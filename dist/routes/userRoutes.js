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
const userController_1 = require("../controllers/userController");
const userController_2 = require("../controllers/userController");
const router = express_1.default.Router();
// Update a specific user
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid user ID');
    }
    try {
        yield (0, userController_1.updateUserController)(req, res);
    }
    catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).send('An unexpected error occurred while updating the user profile. Please try again later.');
    }
}));
// New route for fetching user info by ID
router.get('/user-name/:id', userController_2.getUserByIdController);
exports.default = router;
