import { Schema, model, Document, Types } from 'mongoose';
import { ISubject } from './subjectSchema';
import { ICourse } from './courseSchema';
import { IUser } from './userSchema';
import { IUniversity } from './universitySchema';

type CourseRef = Types.ObjectId | ICourse;
type UserRef = Types.ObjectId | IUser;
type UniversityRef = Types.ObjectId | IUniversity;

interface IClass extends Document {
  university_ref: UniversityRef;
  course_ref: CourseRef;
  year_of_beginning: number;
  class_name: string;
  subjects_ref: ISubject[];
  users_ref: UserRef[];
}

const classSchema = new Schema<IClass>({
  university_ref: {
    type: Schema.Types.ObjectId,
    ref: 'University',
    required: true
  },
  course_ref: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  users_ref: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
});

const Class = model<IClass>('Class', classSchema);

export { Class, IClass };