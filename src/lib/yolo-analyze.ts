/**
 * YOLO-based solar panel defect detection.
 * Calls a Python inference server running the trained YOLO11m model.
 * Falls back to OpenAI Vision API if YOLO server is unavailable.
 */
import type { Defect, DefectType, DefectSeverity } from './types';
import { v4 as uuidv4 } from 'uuid';

const YOLO_SERVER_URL = process.env.YOLO_SERVER_URL || 'http://localhost:8765';

// YOLO class index -> app defect type
const CLASS_MAP: Record<number, DefectType> = {
  0: 'hotspot',
  1: 'hotspot',       // Hotspot-Multi -> hotspot (multi detected by count)
  2: 'bypass_diode',
  3: 'string_failure',
  4: 'crack',
  5: 'soiling',
  6: 'shading',
  7: 'delamination',
};

const CLASS_NAMES = [
  'Hotspot', 'Hotspot-Multi', 'Bypass-Diode', 'String-Failure',
  'Cracking', 'Soiling', 'Shadowing', 'Delamination',
];

// Map defect type to severity based on class
function getSeverity(classIdx: number, confidence: number): DefectSeverity {
  if (classIdx === 3) return 'critical';        // String failure
  if (classIdx === 0 || classIdx === 1) {
    return confidence > 0.7 ? 'critical' : 'warning';  // Hotspots
  }
  if (classIdx === 2) return 'warning';          // Bypass diode
  if (classIdx === 4) return 'warning';          // Cracking
  if (classIdx === 7) return 'warning';          // Delamination
  return 'info';                                  // Soiling, Shadowing
}

function getRemediation(classIdx: number): string[] {
  const remediations: Record<number, string[]> = {
    0: ['Inspect affected cell for micro-cracks', 'Check bypass diode functionality', 'Monitor during next inspection cycle'],
    1: ['Multiple cells affected — schedule immediate inspection', 'Check for systemic wiring issues', 'Measure IV curve of affected string'],
    2: ['Test bypass diode with IV curve tracer', 'Replace bypass diode if failed', 'Check junction box connections'],
    3: ['Check string inverter status and error codes', 'Inspect wiring at combiner box', 'Measure string voltage vs adjacent strings', 'Priority: Schedule immediate repair'],
    4: ['Document crack location and extent', 'Monitor for power degradation', 'Plan panel replacement at next maintenance window'],
    5: ['Schedule panel cleaning', 'Check if drainage is blocked', 'Install bird deterrents if bird droppings'],
    6: ['Identify and remove obstruction if possible', 'Consider panel repositioning', 'Install vegetation management plan'],
    7: ['Document extent of delamination', 'Check warranty coverage', 'Plan panel replacement — delamination is progressive'],
  };
  return remediations[classIdx] || ['Schedule follow-up inspection'];
}

interface YOLODetection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // x1, y1, x2, y2 (normalized)
}

export async function analyzeWithYOLO(
  imageBase64: string,
  uploadId: string,
  projectId: string,
): Promise<{ defects: Defect[]; method: 'yolo' | 'vision' }> {
  try {
    // Try YOLO server first
    const response = await fetch(`${YOLO_SERVER_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`YOLO server returned ${response.status}`);
    }

    const data = await response.json() as { detections: YOLODetection[] };
    
    const defects: Defect[] = data.detections.map((det) => {
      const classIdx = det.class_id;
      const defectType = CLASS_MAP[classIdx] || 'hotspot';
      const severity = getSeverity(classIdx, det.confidence);
      
      // Estimate grid position from bbox center
      const cx = (det.bbox[0] + det.bbox[2]) / 2;
      const cy = (det.bbox[1] + det.bbox[3]) / 2;
      
      return {
        id: uuidv4(),
        projectId,
        uploadId,
        type: defectType,
        severity,
        description: `${CLASS_NAMES[classIdx]} detected (${(det.confidence * 100).toFixed(1)}% confidence)`,
        confidence: det.confidence,
        tempDelta: classIdx <= 1 ? 15 + det.confidence * 25 : undefined,
        location: {
          row: Math.floor(cy * 6),
          col: Math.floor(cx * 10),
        },
        remediation: getRemediation(classIdx),
      };
    });

    return { defects, method: 'yolo' };
  } catch (error) {
    console.warn('YOLO server unavailable, falling back to OpenAI Vision:', error);
    throw error; // Let caller handle fallback
  }
}
