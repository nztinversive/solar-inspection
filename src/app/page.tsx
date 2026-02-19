'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@/lib/types';
import ProjectList from '@/components/ProjectList';
import NewProjectModal from '@/components/NewProjectModal';
import InspectionView from '@/components/InspectionView';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreateProject = async (data: { name: string; location: string; date: string; panelCount: number }) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const project = await res.json();
      if (project.error) throw new Error(project.error);
      setProjects(prev => [project, ...prev]);
      setSelectedProject(project);
      setShowNewModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this inspection? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleProjectUpdate = (updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProject(updated);
  };

  if (selectedProject) {
    return (
      <InspectionView
        project={selectedProject}
        onBack={() => { setSelectedProject(null); fetchProjects(); }}
        onProjectUpdate={handleProjectUpdate}
      />
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-[#F59E0B]">Solar</span>Scan
          </h1>
          <p className="mt-1 text-sm text-[#A0A0A0]">AI-powered drone solar panel inspection</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-[#0F0F0F] transition hover:bg-[#D97706]"
        >
          + New Inspection
        </button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
          <p className="mt-3 text-sm text-[#A0A0A0]">Loading inspections...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16">
          <p className="text-lg text-[#EF4444]">⚠ {error}</p>
          <button
            onClick={() => { setLoading(true); fetchProjects(); }}
            className="mt-4 rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-[#F59E0B] hover:text-[#F5F5F5]"
          >
            Retry
          </button>
        </div>
      ) : (
        <ProjectList
          projects={projects}
          onSelect={setSelectedProject}
          onDelete={handleDeleteProject}
        />
      )}

      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </main>
  );
}
