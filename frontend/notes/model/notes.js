// model/notes.js
import mongoose from 'mongoose';

const NotesSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    unit: {
        type: Number,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    originalFileName: {
        type: String
    },
    fileType: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Notes = mongoose.models.Notes || mongoose.model('Notes', NotesSchema);
export default Notes;