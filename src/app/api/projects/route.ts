import { NextResponse } from 'next/server';
import { projects } from '@/lib/store';
import type { Project } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const all = await projects.getAll();
    return NextResponse.json(all);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project: Project = {
      id: uuidv4(),
      name: body.name || 'Untitled Inspection',
      location: body.location || '',
      date: body.date || new Date().toISOString().split('T')[0],
      panelCount: body.panelCount || 0,
      status: 'draft',
      healthScore: null,
      createdAt: new Date().toISOString(),
    };
    await projects.save(project);
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const existing = await projects.get(body.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = { ...existing, ...body };
    await projects.save(updated);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await projects.remove(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 400 });
  }
}
