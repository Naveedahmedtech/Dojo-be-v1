"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Class = void 0;
const mongoose_1 = require("mongoose");
const classSchema = new mongoose_1.Schema({
    university_ref: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'University',
        required: true
    },
    course_ref: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    year_of_beginning: {
        type: Number,
        required: true
    },
    class_name: {
        type: String,
        required: true
    },
    subjects_ref: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Subject'
        }],
    users_ref: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }]
});
const Class = (0, mongoose_1.model)('Class', classSchema);
exports.Class = Class;
