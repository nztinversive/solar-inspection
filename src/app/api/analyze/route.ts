import { NextResponse } from 'next/server';
import { uploads, projects } from '@/lib/store';
import { analyzeImage, calculateHealthScore, estimatePowerLoss } from '@/lib/analyze';

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const project = await projects.get(projectId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Update status
    project.status = 'processing';
    await projects.save(project);

    const allUploads = await uploads.getByProject(projectId);
    if (allUploads.length === 0) {
      return NextResponse.json({ error: 'No images uploaded' }, { status: 400 });
    }

    const allDefects = [];

    for (const upload of allUploads) {
      if (upload.processedAt) {
        allDefects.push(...upload.defects);
        continue;
      }

      const defects = await analyzeImage(upload.dataUrl, upload.type, upload.id, projectId);
      upload.defects = defects;
      upload.processedAt = new Date().toISOString();
      await uploads.save(upload);
      allDefects.push(...defects);
    }

    const healthScore = calculateHealthScore(project.panelCount || allUploads.length * 10, allDefects);
    const powerLoss = estimatePowerLoss(allDefects);

    project.status = 'complete';
    project.healthScore = healthScore;
    await projects.save(project);

    return NextResponse.json({
      projectId,
      healthScore,
      totalDefects: allDefects.length,
      criticalCount: allDefects.filter(d => d.severity === 'critical').length,
      warningCount: allDefects.filter(d => d.severity === 'warning').length,
      infoCount: allDefects.filter(d => d.severity === 'info').length,
      estimatedPowerLoss: powerLoss,
      defects: allDefects,
    });
  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
