'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Project, Defect, Upload } from '@/lib/types';
import { DEFECT_TYPE_LABELS, SEVERITY_COLORS, SEVERITY_BG, DEFECT_TYPE_COLORS } from '@/lib/types';
import DefectMap from './DefectMap';

interface InspectionViewProps {
  project: Project;
  onBack: () => void;
  onProjectUpdate: (project: Project) => void;
}

interface AnalysisResult {
  healthScore: number;
  totalDefects: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  estimatedPowerLoss: number;
  defects: Defect[];
}

export default function InspectionView({ project, onBack, onProjectUpdate }: InspectionViewProps) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'results'>('upload');

  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchUploads = useCallback(async () => {
    try {
      const res = await fetch(`/api/upload?projectId=${project.id}`);
      if (!res.ok) throw new Error('Failed to load uploads');
      const data = await res.json();
      if (!Array.isArray(data)) { setUploads([]); return; }
      setUploads(data);

    // If project is complete and has processed uploads, reconstruct results
    if (project.status === 'complete' && Array.isArray(data)) {
      const allDefects = data.flatMap((u: Upload) => u.defects || []);
      if (allDefects.length > 0 || project.healthScore !== null) {
        setResult({
          healthScore: project.healthScore ?? 100,
          totalDefects: allDefects.length,
          criticalCount: allDefects.filter((d: Defect) => d.severity === 'critical').length,
          warningCount: allDefects.filter((d: Defect) => d.severity === 'warning').length,
          infoCount: allDefects.filter((d: Defect) => d.severity === 'info').length,
          estimatedPowerLoss: 0,
          defects: allDefects,
        });
        setActiveTab('results');
      }
    }
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
      setUploadError('Failed to load uploaded images');
    }
  }, [project.id, project.status, project.healthScore]);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        // Validate file size (max 10MB for base64 storage)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`${file.name} exceeds 10MB limit — skipped`);
          continue;
        }

        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        const isThermal = file.name.toLowerCase().includes('thermal') ||
          file.name.toLowerCase().includes('flir') ||
          file.name.toLowerCase().includes('ir_');

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            filename: file.name,
            type: isThermal ? 'thermal' : 'rgb',
            dataUrl,
          }),
        });

        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
        successCount++;
      } catch (err) {
        console.error(`Upload error for ${file.name}:`, err);
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      }
    }

    setUploading(false);
    if (successCount > 0) fetchUploads();
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setResult(data);
        setActiveTab('results');
        onProjectUpdate({ ...project, status: 'complete', healthScore: data.healthScore });
      }
    } catch {
      alert('Analysis failed');
    }
    setAnalyzing(false);
  };

  const handleRemoveUpload = async (uploadId: string) => {
    try {
      const res = await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, uploadId }),
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchUploads();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to remove image');
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-[#A0A0A0] transition hover:border-[#555]"
        >
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-xs text-[#A0A0A0]">
            {project.location && `📍 ${project.location} · `}{project.date} · {project.panelCount} panels
          </p>
        </div>
        {result && (
          <div className="text-right">
            <p
              className="text-3xl font-bold"
              style={{ color: result.healthScore >= 80 ? '#22C55E' : result.healthScore >= 50 ? '#F59E0B' : '#EF4444' }}
            >
              {result.healthScore}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[#666]">Health Score</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-1">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === 'upload' ? 'bg-[#F59E0B] text-[#0F0F0F]' : 'text-[#A0A0A0] hover:text-[#F5F5F5]'
          }`}
        >
          📸 Upload Images ({uploads.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          disabled={!result}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === 'results' ? 'bg-[#F59E0B] text-[#0F0F0F]' : 'text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-30'
          }`}
        >
          📊 Results {result ? `(${result.totalDefects} defects)` : ''}
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Error banner */}
          {uploadError && (
            <div className="flex items-center justify-between rounded-lg border border-[#EF4444]/30 bg-[#2A1714] px-4 py-3 text-sm text-[#EF4444]">
              <span>⚠ {uploadError}</span>
              <button onClick={() => setUploadError(null)} className="ml-2 text-[#666] hover:text-[#A0A0A0]">✕</button>
            </div>
          )}

          {/* Drop zone */}
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#2A2A2A] bg-[#1A1A1A] py-12 transition hover:border-[#F59E0B]/50">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
            ) : (
              <>
                <p className="text-lg text-[#A0A0A0]">Drop thermal & RGB images here</p>
                <p className="mt-1 text-xs text-[#666]">
                  Files with &quot;thermal&quot;, &quot;flir&quot;, or &quot;ir_&quot; in the name are auto-tagged as thermal
                </p>
              </>
            )}
          </label>

          {/* Uploaded images */}
          {uploads.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {uploads.map(upload => (
                <div key={upload.id} className="group relative overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={upload.dataUrl}
                    alt={upload.filename}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="truncate text-[10px] text-white">{upload.filename}</p>
                    <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                      upload.type === 'thermal' ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#3B82F6]/20 text-[#3B82F6]'
                    }`}>
                      {upload.type}
                    </span>
                    {upload.processedAt && (
                      <span className="ml-1 inline-block rounded bg-[#22C55E]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[#22C55E]">
                        ✓ Analyzed
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveUpload(upload.id)}
                    className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100 hover:bg-[#EF4444]"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Analyze button */}
          {uploads.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full rounded-lg bg-[#F59E0B] py-3 text-sm font-bold text-[#0F0F0F] transition hover:bg-[#D97706] disabled:opacity-50"
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F0F0F] border-t-transparent" />
                  Analyzing {uploads.length} images with AI...
                </span>
              ) : (
                `🔍 Analyze ${uploads.length} Images`
              )}
            </button>
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Health Score" value={`${result.healthScore}%`} color={result.healthScore >= 80 ? '#22C55E' : result.healthScore >= 50 ? '#F59E0B' : '#EF4444'} />
            <SummaryCard label="Critical" value={String(result.criticalCount)} color="#EF4444" />
            <SummaryCard label="Warnings" value={String(result.warningCount)} color="#F59E0B" />
            <SummaryCard label="Power Loss" value={`~${result.estimatedPowerLoss}%`} color="#3B82F6" />
          </div>

          {/* Panel Health Map */}
          <DefectMap
            panelCount={project.panelCount}
            defects={result.defects}
            selectedDefect={selectedDefect}
            onSelectDefect={setSelectedDefect}
          />

          {/* Defect List */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="border-b border-[#2A2A2A] px-5 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#A0A0A0]">
                Detected Defects ({result.defects.length})
              </h3>
            </div>
            <div className="max-h-[500px] divide-y divide-[#2A2A2A] overflow-y-auto">
              {result.defects.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[#666]">
                  No defects detected — panels appear healthy ✓
                </div>
              ) : (
                result.defects.map(defect => (
                  <button
                    key={defect.id}
                    onClick={() => setSelectedDefect(selectedDefect?.id === defect.id ? null : defect)}
                    className={`w-full px-5 py-3 text-left transition hover:bg-[#222] ${
                      selectedDefect?.id === defect.id ? 'bg-[#222]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: SEVERITY_BG[defect.severity], color: SEVERITY_COLORS[defect.severity] }}
                      >
                        {defect.severity === 'critical' ? '!' : defect.severity === 'warning' ? '⚠' : 'i'}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                            style={{ backgroundColor: `${DEFECT_TYPE_COLORS[defect.type]}22`, color: DEFECT_TYPE_COLORS[defect.type] }}
                          >
                            {DEFECT_TYPE_LABELS[defect.type]}
                          </span>
                          <span className="text-[10px] text-[#666]">
                            {Math.round(defect.confidence * 100)}% confidence
                          </span>
                          {defect.tempDelta && (
                            <span className="text-[10px] text-[#EF4444]">
                              +{defect.tempDelta.toFixed(1)}°C
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[#D0D0D0]">{defect.description}</p>
                        {selectedDefect?.id === defect.id && defect.remediation.length > 0 && (
                          <div className="mt-2 space-y-1 rounded bg-[#0F0F0F] p-2">
                            <p className="text-[10px] font-semibold uppercase text-[#A0A0A0]">Remediation</p>
                            {defect.remediation.map((rem, i) => (
                              <p key={i} className="text-xs text-[#888]">• {rem}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#666]">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
