import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export const runtime = 'nodejs';

// Max file size allowed for upload: 5 MB (before compression)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const slug = (formData.get('slug') as string) || 'trek';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit. Please upload a smaller photo.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Optimize & compress:
    // Resize max width 1200px, convert to WebP quality 80 for low file size and high fidelity
    const optimizedBuffer = await sharp(inputBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 40) || 'trek';
    const filename = `${cleanSlug}-${Date.now()}.webp`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'treks');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, optimizedBuffer);

    const publicUrl = `/uploads/treks/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      sizeBytes: optimizedBuffer.byteLength,
      sizeKb: Math.round(optimizedBuffer.byteLength / 1024),
    });
  } catch (error) {
    console.error('Error processing trek image upload:', error);
    return NextResponse.json({ error: 'Failed to upload and optimize image' }, { status: 500 });
  }
}
