import Notes from '@/model/notes';
import { NextResponse } from "next/server";
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function connectdb() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (error) {
        console.log('DB Connection Error:', error);
    }
}


export async function DELETE(req, { params }) {
    try {
        await connectdb();
        const { id } = await params;
        console.log('📝 Deleting note with ID:', id); // 🔍 Debug log
        
        const note = await Notes.findById(id);
        console.log('📄 Found note:', note); // 🔍 Debug log
        
        if (!note) {
            return NextResponse.json(
                { message: "Note not found" },
                { status: 404 }
            );
        }

        if (note.publicId) {
            console.log('☁️ Deleting from Cloudinary:', note.publicId); // 🔍 Debug log
            const result = await cloudinary.uploader.destroy(note.publicId, { 
                resource_type: 'auto' 
            });
            console.log('☁️ Cloudinary result:', result); // 🔍 Debug log
            
            if (result.result !== 'ok' && result.result !== 'not found') {
                return NextResponse.json(
                    { message: "Error deleting file from Cloudinary" },
                    { status: 400 }
                );
            }
        }

        const deletedNote = await Notes.findByIdAndDelete(id);
        console.log('🗑️ Deleted from DB:', deletedNote); // 🔍 Debug log

        return NextResponse.json(
            { 
                message: "Successfully deleted note",
                data: deletedNote 
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('DELETE Error:', error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}