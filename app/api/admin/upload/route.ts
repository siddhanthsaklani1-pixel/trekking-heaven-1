import { NextResponse, type NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';

export const runtime = 'nodejs';

// Max file size allowed for upload: 3 MB (before compression)
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error('Trek image upload configuration error: Blob read-write token is missing.');
    return NextResponse.json(
      { error: 'Image uploads are not configured. Please contact the site administrator.' },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
    const file = formData.get('file');
    const slugValue = formData.get('slug');
    const slug = typeof slugValue === 'string' ? slugValue : 'trek';

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
        { error: 'File size exceeds 3MB limit. Please upload a smaller photo.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let optimizedBuffer: Buffer;
    try {
      // Resize max width 1200px, convert to WebP quality 80 for low file size and high fidelity.
      optimizedBuffer = await sharp(inputBuffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Trek image upload failed during image optimization:', error);
      return NextResponse.json(
        { error: 'This image could not be processed. Try a different JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 40) || 'trek';
    const filename = `treks/${cleanSlug}-${Date.now()}.webp`;

    try {
      const blob = await put(filename, optimizedBuffer, {
        access: 'public',
        contentType: 'image/webp',
        addRandomSuffix: true,
        token: blobToken,
      });

      return NextResponse.json({
        success: true,
        url: blob.url,
        sizeBytes: optimizedBuffer.byteLength,
        sizeKb: Math.round(optimizedBuffer.byteLength / 1024),
      });
    } catch (error) {
      console.error('Trek image upload failed while storing the image in Blob:', error);
      return NextResponse.json(
        { error: 'The image was optimized but could not be stored. Please try again later.' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Trek image upload failed while reading the request:', error);
    return NextResponse.json(
      { error: 'The upload request could not be read. Please try again.' },
      { status: 400 }
    );
  }
}
