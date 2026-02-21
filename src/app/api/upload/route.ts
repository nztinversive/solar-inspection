import { NextResponse } from 'next/server';
import { uploads } from '@/lib/store';
import type { Upload } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    const all = await uploads.getByProject(projectId);
    return NextResponse.json(all);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const upload: Upload = {
      id: uuidv4(),
      projectId: body.projectId,
      filename: body.filename || 'image.jpg',
      type: body.type || 'rgb',
      dataUrl: body.dataUrl,
      processedAt: null,
      defects: [],
    };
    await uploads.save(upload);
    return NextResponse.json({ id: upload.id, filename: upload.filename, type: upload.type });
  } catch {
    return NextResponse.json({ error: 'Failed to upload' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { projectId, uploadId } = await req.json();
    await uploads.remove(projectId, uploadId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 400 });
  }
}
