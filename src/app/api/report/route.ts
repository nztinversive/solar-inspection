import { NextResponse } from 'next/server';
import { projects, uploads } from '@/lib/store';
import { calculateHealthScore, estimatePowerLoss } from '@/lib/analyze';
import type { InspectionReport } from '@/lib/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const project = await projects.get(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const allUploads = await uploads.getByProject(projectId);
    const allDefects = allUploads.flatMap(u => u.defects || []);

    const healthScore = calculateHealthScore(project.panelCount || allUploads.length * 10, allDefects);
    const powerLoss = estimatePowerLoss(allDefects);

    const report: InspectionReport = {
      projectId,
      generatedAt: new Date().toISOString(),
      healthScore,
      totalPanels: project.panelCount,
      defectsFound: allDefects.length,
      criticalCount: allDefects.filter(d => d.severity === 'critical').length,
      warningCount: allDefects.filter(d => d.severity === 'warning').length,
      infoCount: allDefects.filter(d => d.severity === 'info').length,
      estimatedPowerLoss: powerLoss,
      defects: allDefects,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
