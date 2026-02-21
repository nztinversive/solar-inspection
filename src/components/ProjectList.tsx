'use client';

import type { Project } from '@/lib/types';

interface ProjectListProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  onDelete: (id: string) => void;
}

function statusBadge(status: Project['status']) {
  const colors: Record<string, string> = {
    draft: 'bg-[#2A2A2A] text-[#A0A0A0]',
    uploading: 'bg-[#1E293B] text-[#3B82F6]',
    processing: 'bg-[#2A2216] text-[#F59E0B]',
    complete: 'bg-[#14291A] text-[#22C55E]',
  };
  return colors[status] || colors.draft;
}

function healthColor(score: number | null): string {
  if (score === null) return '#A0A0A0';
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

export default function ProjectList({ projects, onSelect, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2A2A2A] py-20">
        <p className="text-lg text-[#A0A0A0]">No inspections yet</p>
        <p className="mt-1 text-sm text-[#666]">Create your first inspection to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(project => (
        <div
          key={project.id}
          className="group cursor-pointer rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition hover:border-[#F59E0B]/50 hover:bg-[#222]"
          onClick={() => onSelect(project)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-[#F5F5F5]">{project.name}</h3>
              {project.location && (
                <p className="mt-0.5 text-xs text-[#A0A0A0]">📍 {project.location}</p>
              )}
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge(project.status)}`}>
              {project.status}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-xs text-[#666]">{project.date}</p>
              <p className="text-xs text-[#A0A0A0]">{project.panelCount} panels</p>
            </div>
            {project.healthScore !== null && (
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: healthColor(project.healthScore) }}>
                  {project.healthScore}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#666]">Health</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="rounded px-2 py-1 text-xs text-[#666] opacity-0 transition hover:bg-[#2A1714] hover:text-[#EF4444] group-hover:opacity-100"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
