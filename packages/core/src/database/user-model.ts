import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'],
      default: 'editor',
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
