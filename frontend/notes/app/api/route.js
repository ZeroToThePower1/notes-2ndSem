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
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.log('❌ DB Connection Error:', error);
    }
}
connectdb();

export async function GET() {
    console.log('📥 GET request received');
    try {
        const data = await Notes.find();
        console.log(`✅ Retrieved ${data.length} notes`);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('❌ GET Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    console.log('📤 POST request received');
    try {
        console.log('📋 Parsing form data...');
        const formData = await req.formData();

        const name = formData.get('name');
        const subject = formData.get('subject');
        const unit = formData.get('unit');
        const course = formData.get('course');
        const file = formData.get('file');

        console.log('📝 Form fields:', {
            name,
            subject,
            unit,
            course,
            file: file ? {
                name: file.name,
                size: file.size,
                type: file.type
            } : null
        });

        if (!name || !subject || !unit || !course || !file) {
            console.log('❌ Validation failed - missing fields');
            return NextResponse.json(
                { success: false, error: 'All fields are required' },
                { status: 400 }
            );
        }

        // ✅ Get file extension
        const fileExtension = file.name.split('.').pop().toLowerCase();
        console.log(`📎 File extension: ${fileExtension}`);

        // ✅ Determine resource type based on file type
        const documentTypes = ['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt'];
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv'];

        let resourceType = 'auto';
        if (documentTypes.includes(fileExtension)) {
            resourceType = 'raw'; // ✅ For documents
        } else if (imageTypes.includes(fileExtension)) {
            resourceType = 'image'; // For images
        } else if (videoTypes.includes(fileExtension)) {
            resourceType = 'video'; // For videos
        }

        console.log(`☁️ Resource type: ${resourceType}`);

        console.log('🔄 Converting file to buffer...');
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        console.log(`📦 Buffer created: ${buffer.length} bytes`);

        // ✅ Upload to Cloudinary with correct resource type
        console.log(`☁️ Uploading to Cloudinary - folder: notes/${course}`);

        // In your POST route
        const result = await new Promise((resolve, reject) => {
            cloudinary.v2.uploader.upload_stream({
                folder: `notes/${course}`,
                resource_type: resourceType,
                use_filename: true,
                unique_filename: true,
                invalidate: true,
                timeout: 60000,
                filename_override: file.name, // Preserve original filename
                display_name: file.name,      // Display name in Cloudinary
                // For raw files, add these
                ...(resourceType === 'raw' && {
                    format: 'raw',
                    // Force download as attachment with original name
                    flags: 'attachment'
                })
            }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }).end(buffer);
        });

        console.log('📦 Cloudinary result:', {
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            resource_type: result.resource_type
        });

        // ✅ Construct file URL (fallback if secure_url is missing)
        const fileUrl = result.secure_url ||
            `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/${result.public_id}`;

        console.log('💾 Saving to database...');
        const saved = await Notes.create({
            Name: name,
            subject: subject,
            unit: Number(unit),
            course: course,
            publicId: result.public_id,
            fileUrl: fileUrl,
            originalFileName: file.name,
            fileType: fileExtension
        });

        console.log('✅ Note saved successfully:', {
            id: saved._id,
            Name: saved.Name,
            publicId: saved.publicId,
            fileUrl: saved.fileUrl,
            fileType: saved.fileType
        });

        return NextResponse.json({
            success: true,
            data: saved
        }, { status: 201 });

    } catch (error) {
        console.error('❌ POST Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}