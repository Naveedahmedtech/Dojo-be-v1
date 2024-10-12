import { Schema, model, Document, Types } from 'mongoose';
import { ICourse } from './courseSchema';

export interface IUniversity extends Document {
  university_name: string;
  courses_ref: Types.Array<Types.ObjectId | ICourse>; 
}

const universitySchema = new Schema<IUniversity>({
  university_name: {
    type: String,
    required: true,
    unique: true
  },
  courses_ref: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }
  ]
});

const University = model<IUniversity>('University', universitySchema);

export default University;