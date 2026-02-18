import { promises as fs } from 'fs';
import path from 'path';
import type { Project, Upload } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch { /* exists */ }
}

async function readJSON<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(file: string, data: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}

export const projects = {
  async getAll(): Promise<Project[]> {
    return readJSON<Project[]>('projects.json', []);
  },
  async get(id: string): Promise<Project | undefined> {
    const all = await this.getAll();
    return all.find(p => p.id === id);
  },
  async save(project: Project): Promise<void> {
    const all = await this.getAll();
    const idx = all.findIndex(p => p.id === project.id);
    if (idx >= 0) all[idx] = project;
    else all.push(project);
    await writeJSON('projects.json', all);
  },
  async remove(id: string): Promise<void> {
    const all = await this.getAll();
    await writeJSON('projects.json', all.filter(p => p.id !== id));
  },
};

export const uploads = {
  async getByProject(projectId: string): Promise<Upload[]> {
    return readJSON<Upload[]>(`uploads-${projectId}.json`, []);
  },
  async save(upload: Upload): Promise<void> {
    const all = await this.getByProject(upload.projectId);
    const idx = all.findIndex(u => u.id === upload.id);
    if (idx >= 0) all[idx] = upload;
    else all.push(upload);
    await writeJSON(`uploads-${upload.projectId}.json`, all);
  },
  async remove(projectId: string, uploadId: string): Promise<void> {
    const all = await this.getByProject(projectId);
    await writeJSON(`uploads-${projectId}.json`, all.filter(u => u.id !== uploadId));
  },
};
