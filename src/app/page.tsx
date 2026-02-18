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

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreateProject = async (data: { name: string; location: string; date: string; panelCount: number }) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const project = await res.json();
    setProjects(prev => [project, ...prev]);
    setSelectedProject(project);
    setShowNewModal(false);
  };

  const handleDeleteProject = async (id: string) => {
    await fetch('/api/projects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) setSelectedProject(null);
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
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
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
