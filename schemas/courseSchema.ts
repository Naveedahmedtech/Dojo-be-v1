import { Schema, model, Document } from 'mongoose';
import { IUniversity } from './universitySchema';
import { IClass } from './classSchema';

interface ICourse extends Document {
  university_ref: IUniversity['_id'];
  course_name: string;
  classes_ref: IClass['_id'][];
}

const courseSchema = new Schema<ICourse>({
  university_ref: {
    type: Schema.Types.ObjectId,
    ref: 'University',
    required: true
  },
  classes_ref: [{
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: false
  }],
  course_name: {
    type: String,
    required: true,
  },
});

const Course = model<ICourse>('Course', courseSchema);

export { Course, ICourse };