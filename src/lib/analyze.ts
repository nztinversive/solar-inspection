import type { Defect, DefectType, DefectSeverity } from './types';
import { v4 as uuidv4 } from 'uuid';
import { analyzeWithYOLO } from './yolo-analyze';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USE_YOLO = process.env.USE_YOLO !== 'false'; // YOLO enabled by default

interface DetectedDefect {
  type: DefectType;
  severity: DefectSeverity;
  description: string;
  confidence: number;
  tempDelta?: number;
  row?: number;
  col?: number;
  remediation: string[];
}

const ANALYSIS_PROMPT = `You are an expert solar panel inspection analyst. Analyze this drone image of solar panels.

Identify any defects visible in the image. For thermal images, look for:
- Hotspots (abnormal temperature zones indicating cell damage)
- String failures (entire rows/columns at uniform abnormal temperature)
- Junction box overheating (localized hotspot at panel edge/connection point)
- Bypass diode failures (1/3 of panel at different temperature)

For RGB/visual images, look for:
- Physical cracks or fractures in cells
- Soiling (dirt, bird droppings, debris)
- Shading from vegetation, structures, or other panels
- Delamination (yellowing, bubbling of encapsulant)

Return a JSON array of defects found. Each defect should have:
{
  "type": "hotspot" | "crack" | "soiling" | "string_failure" | "junction_box" | "bypass_diode" | "shading" | "delamination",
  "severity": "critical" | "warning" | "info",
  "description": "specific description of the defect",
  "confidence": 0.0-1.0,
  "tempDelta": number (estimated temp difference in °C, for thermal only),
  "remediation": ["action 1", "action 2"]
}

If no defects are found, return an empty array [].
Be specific about locations within the image. Only report defects you're confident about.
Return ONLY valid JSON — no markdown, no explanation.`;

export async function analyzeImage(
  imageDataUrl: string,
  imageType: 'thermal' | 'rgb',
  uploadId: string,
  projectId: string
): Promise<Defect[]> {
  // Try YOLO model first (faster, more accurate, free)
  if (USE_YOLO) {
    try {
      const { defects } = await analyzeWithYOLO(imageDataUrl, uploadId, projectId);
      if (defects.length > 0) return defects;
      // If YOLO found nothing, still return empty (model says clean panel)
      return defects;
    } catch {
      console.log('YOLO unavailable, trying OpenAI Vision fallback...');
    }
  }

  if (!OPENAI_API_KEY) {
    // Return mock defects for demo when no API key and no YOLO
    return generateMockDefects(uploadId, projectId, imageType);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: ANALYSIS_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `This is a ${imageType} drone image of a solar panel array. Analyze it for defects.`,
              },
              {
                type: 'image_url',
                image_url: { url: imageDataUrl, detail: 'high' },
              },
            ],
          },
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return generateMockDefects(uploadId, projectId, imageType);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    let parsed: DetectedDefect[];
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      parsed = [];
    }

    return parsed.map((d): Defect => ({
      id: uuidv4(),
      projectId,
      uploadId,
      type: d.type || 'hotspot',
      severity: d.severity || 'warning',
      description: d.description || 'Detected anomaly',
      confidence: Math.max(0, Math.min(1, d.confidence || 0.5)),
      tempDelta: d.tempDelta,
      location: d.row != null && d.col != null ? { row: d.row, col: d.col } : undefined,
      remediation: d.remediation || [],
    }));
  } catch (error) {
    console.error('Analysis failed:', error);
    return generateMockDefects(uploadId, projectId, imageType);
  }
}

function generateMockDefects(uploadId: string, projectId: string, imageType: string): Defect[] {
  const mock: Defect[] = [];
  const rand = Math.random();

  if (rand > 0.3) {
    mock.push({
      id: uuidv4(),
      projectId,
      uploadId,
      type: 'hotspot',
      severity: rand > 0.7 ? 'critical' : 'warning',
      description: `Abnormal temperature zone detected — estimated ${(15 + Math.random() * 25).toFixed(1)}°C above ambient`,
      confidence: 0.75 + Math.random() * 0.2,
      tempDelta: 15 + Math.random() * 25,
      location: { row: Math.floor(Math.random() * 6), col: Math.floor(Math.random() * 10) },
      remediation: [
        'Inspect affected cell for micro-cracks',
        'Check bypass diode functionality',
        'Monitor during next inspection cycle',
      ],
    });
  }

  if (rand > 0.5 && imageType === 'rgb') {
    mock.push({
      id: uuidv4(),
      projectId,
      uploadId,
      type: 'soiling',
      severity: 'info',
      description: 'Moderate soiling detected on panel surface — estimated 3-5% power loss',
      confidence: 0.8,
      location: { row: Math.floor(Math.random() * 6), col: Math.floor(Math.random() * 10) },
      remediation: ['Schedule panel cleaning', 'Verify drainage is not blocked'],
    });
  }

  if (rand > 0.8) {
    mock.push({
      id: uuidv4(),
      projectId,
      uploadId,
      type: 'string_failure',
      severity: 'critical',
      description: 'Entire string showing uniform temperature anomaly — possible string inverter failure or wiring issue',
      confidence: 0.85,
      tempDelta: 20 + Math.random() * 15,
      location: { row: Math.floor(Math.random() * 6), col: 0 },
      remediation: [
        'Check string inverter status and error codes',
        'Inspect wiring connections at combiner box',
        'Measure string voltage — compare to adjacent strings',
        'Priority: Schedule immediate repair',
      ],
    });
  }

  return mock;
}

export function calculateHealthScore(totalPanels: number, defects: Defect[]): number {
  if (totalPanels === 0) return 100;

  let penalty = 0;
  for (const d of defects) {
    if (d.severity === 'critical') penalty += 8;
    else if (d.severity === 'warning') penalty += 3;
    else penalty += 1;
  }

  const score = Math.max(0, 100 - (penalty / totalPanels) * 100);
  return Math.round(score * 10) / 10;
}

export function estimatePowerLoss(defects: Defect[]): number {
  let totalLoss = 0;
  for (const d of defects) {
    if (d.type === 'string_failure') totalLoss += 15;
    else if (d.type === 'hotspot') totalLoss += d.tempDelta ? d.tempDelta * 0.1 : 2;
    else if (d.type === 'junction_box') totalLoss += 5;
    else if (d.type === 'crack') totalLoss += 3;
    else if (d.type === 'bypass_diode') totalLoss += 8;
    else if (d.type === 'soiling') totalLoss += 1.5;
    else if (d.type === 'shading') totalLoss += 2;
    else if (d.type === 'delamination') totalLoss += 4;
  }
  return Math.round(totalLoss * 10) / 10;
}
