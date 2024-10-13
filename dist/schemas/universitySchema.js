"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const universitySchema = new mongoose_1.Schema({
    university_name: {
        type: String,
        required: true,
        unique: true
    },
    courses_ref: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Course'
        }
    ]
});
const University = (0, mongoose_1.model)('University', universitySchema);
exports.default = University;
