export interface Project {
  id: string;
  name: string;
  location: string;
  date: string;
  panelCount: number;
  status: 'draft' | 'uploading' | 'processing' | 'complete';
  healthScore: number | null;
  createdAt: string;
}

export type DefectType =
  | 'hotspot'
  | 'crack'
  | 'soiling'
  | 'string_failure'
  | 'junction_box'
  | 'bypass_diode'
  | 'shading'
  | 'delamination';

export type DefectSeverity = 'critical' | 'warning' | 'info';

export interface Defect {
  id: string;
  projectId: string;
  uploadId: string;
  type: DefectType;
  severity: DefectSeverity;
  description: string;
  confidence: number;
  tempDelta?: number;
  location?: { row: number; col: number };
  remediation: string[];
}

export interface Upload {
  id: string;
  projectId: string;
  filename: string;
  type: 'thermal' | 'rgb';
  /** base64 data URL for MVP */
  dataUrl: string;
  processedAt: string | null;
  defects: Defect[];
}

export interface InspectionReport {
  projectId: string;
  generatedAt: string;
  healthScore: number;
  totalPanels: number;
  defectsFound: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  estimatedPowerLoss: number;
  defects: Defect[];
}

export const DEFECT_TYPE_LABELS: Record<DefectType, string> = {
  hotspot: 'Hotspot',
  crack: 'Cell Crack',
  soiling: 'Soiling',
  string_failure: 'String Failure',
  junction_box: 'Junction Box',
  bypass_diode: 'Bypass Diode',
  shading: 'Shading',
  delamination: 'Delamination',
};

export const SEVERITY_COLORS: Record<DefectSeverity, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const SEVERITY_BG: Record<DefectSeverity, string> = {
  critical: '#2A1714',
  warning: '#2A2216',
  info: '#1A2030',
};

export const DEFECT_TYPE_COLORS: Record<DefectType, string> = {
  hotspot: '#EF4444',
  crack: '#F97316',
  soiling: '#A3A3A3',
  string_failure: '#DC2626',
  junction_box: '#F59E0B',
  bypass_diode: '#FBBF24',
  shading: '#6B7280',
  delamination: '#9333EA',
};
