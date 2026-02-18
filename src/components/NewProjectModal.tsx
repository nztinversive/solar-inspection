'use client';

import { useState } from 'react';

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; location: string; date: string; panelCount: number }) => void;
}

export default function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [panelCount, setPanelCount] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), location: location.trim(), date, panelCount });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl"
      >
        <h2 className="mb-5 text-lg font-bold">New Inspection</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#A0A0A0]">Site Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sunridge Solar Farm"
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#555] focus:border-[#F59E0B] focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#A0A0A0]">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Austin, TX"
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#555] focus:border-[#F59E0B] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#A0A0A0]">Inspection Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#A0A0A0]">Panel Count</label>
              <input
                type="number"
                value={panelCount}
                onChange={e => setPanelCount(Number(e.target.value))}
                min={1}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#A0A0A0] transition hover:border-[#555]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-[#0F0F0F] transition hover:bg-[#D97706] disabled:opacity-40"
          >
            Create Inspection
          </button>
        </div>
      </form>
    </div>
  );
}
