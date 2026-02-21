'use client';

import type { Defect } from '@/lib/types';
import { SEVERITY_COLORS, DEFECT_TYPE_LABELS } from '@/lib/types';

interface DefectMapProps {
  panelCount: number;
  defects: Defect[];
  selectedDefect: Defect | null;
  onSelectDefect: (defect: Defect | null) => void;
}

export default function DefectMap({ panelCount, defects, selectedDefect, onSelectDefect }: DefectMapProps) {
  // Create a grid layout — estimate rows and columns
  const cols = Math.min(Math.ceil(Math.sqrt(panelCount * 1.5)), 20);
  const rows = Math.ceil(panelCount / cols);

  // Map defects to grid positions
  const defectsByPosition = new Map<string, Defect[]>();
  for (const d of defects) {
    const row = d.location?.row ?? Math.floor(Math.random() * rows);
    const col = d.location?.col ?? Math.floor(Math.random() * cols);
    const key = `${row}-${col}`;
    if (!defectsByPosition.has(key)) defectsByPosition.set(key, []);
    defectsByPosition.get(key)!.push(d);
  }

  const cells: { row: number; col: number; idx: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < panelCount) cells.push({ row: r, col: c, idx });
    }
  }

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#A0A0A0]">Panel Health Map</h3>
        <div className="flex gap-3 text-[10px] text-[#666]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#22C55E]" /> Healthy
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#F59E0B]" /> Warning
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#EF4444]" /> Critical
          </span>
        </div>
      </div>

      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {cells.map(({ row, col, idx }) => {
          const key = `${row}-${col}`;
          const cellDefects = defectsByPosition.get(key) || [];
          const worstSeverity = cellDefects.length > 0
            ? (cellDefects.some(d => d.severity === 'critical') ? 'critical'
              : cellDefects.some(d => d.severity === 'warning') ? 'warning' : 'info')
            : null;

          const isSelected = cellDefects.some(d => d.id === selectedDefect?.id);

          let bgColor = '#1E3A1E'; // healthy green
          if (worstSeverity === 'critical') bgColor = '#3A1E1E';
          else if (worstSeverity === 'warning') bgColor = '#3A2E1E';
          else if (worstSeverity === 'info') bgColor = '#1E2A3A';

          let borderColor = 'transparent';
          if (isSelected) borderColor = '#F59E0B';
          else if (worstSeverity === 'critical') borderColor = '#EF4444';
          else if (worstSeverity === 'warning') borderColor = '#F59E0B';

          return (
            <button
              key={idx}
              onClick={() => {
                if (cellDefects.length > 0) {
                  onSelectDefect(isSelected ? null : cellDefects[0]);
                }
              }}
              className="aspect-[2/1] rounded-[2px] transition-all hover:brightness-125"
              style={{
                backgroundColor: bgColor,
                border: `1.5px solid ${borderColor}`,
                cursor: cellDefects.length > 0 ? 'pointer' : 'default',
              }}
              title={cellDefects.length > 0
                ? cellDefects.map(d => `${DEFECT_TYPE_LABELS[d.type]}: ${d.description}`).join('\n')
                : `Panel ${idx + 1} — Healthy`
              }
            />
          );
        })}
      </div>

      {selectedDefect && (
        <div className="mt-3 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
          <div className="flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
              style={{ color: SEVERITY_COLORS[selectedDefect.severity] }}
            >
              {selectedDefect.severity}
            </span>
            <span className="text-sm text-[#D0D0D0]">{DEFECT_TYPE_LABELS[selectedDefect.type]}</span>
          </div>
          <p className="mt-1 text-xs text-[#888]">{selectedDefect.description}</p>
        </div>
      )}
    </div>
  );
}
