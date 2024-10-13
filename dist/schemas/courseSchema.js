"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Course = void 0;
const mongoose_1 = require("mongoose");
const courseSchema = new mongoose_1.Schema({
    university_ref: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'University',
        required: true
    },
    classes_ref: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Class',
            required: false
        }],
    course_name: {
        type: String,
        required: true,
    },
});
const Course = (0, mongoose_1.model)('Course', courseSchema);
exports.Course = Course;
