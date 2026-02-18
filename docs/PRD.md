# PRD: Solar Panel Inspection Platform

## Overview
AI-powered drone thermal/RGB image analysis platform for solar panel inspections. Upload drone imagery → AI detects defects (hotspots, cracks, soiling, string failures) → generates professional inspection report with defect locations mapped to panel layout.

## Problem
- Solar farms need annual inspections (required by warranties, insurance, and O&M contracts)
- Manual inspection is slow, dangerous, and misses defects
- DroneDeploy charges $300+/mo, Raptor Maps is enterprise-only
- Freelance drone pilots have no affordable tool to process thermal imagery and deliver bankable reports
- $4.5B solar inspection market growing 15%/year

## Target Users
1. **Drone service providers** doing solar inspections (primary)
2. **Solar O&M companies** with in-house drone programs
3. **Solar installers** doing commissioning inspections
4. **Asset owners/investors** who want to verify panel health

## Core Features (MVP)

### 1. Project Dashboard
- Create inspection projects (site name, location, date, panel count)
- Project list with status (uploading → processing → complete)
- Basic stats: total panels, defects found, health score

### 2. Image Upload
- Drag-drop thermal (FLIR/DJI radiometric) + RGB images
- Bulk upload support
- Auto-detect image type (thermal vs RGB)
- Preview thumbnails during upload

### 3. AI Defect Detection
- **Hotspot detection** — abnormal temperature zones on thermal images
- **Cell crack identification** — visible fractures on RGB
- **Soiling/shading analysis** — dirt, bird droppings, vegetation shadows
- **String failure detection** — entire strings showing uniform temperature anomaly
- **Junction box overheating** — localized hotspots at connection points
- Uses OpenAI Vision API for analysis (GPT-5-mini with structured output)

### 4. Defect Map
- Grid layout showing panel positions
- Color-coded overlays: green (healthy), yellow (warning), red (critical)
- Click a panel → see defect details, thermal image, severity rating
- Defect categories: hotspot, crack, soiling, string failure, junction box, bypass diode

### 5. Report Generation
- Professional PDF report with:
  - Site overview and metadata
  - Executive summary (health score, defect count by severity)
  - Defect table with locations, images, severity, recommended action
  - Panel map with color overlay
  - Thermal + RGB image pairs for each defect
- Brandable (company logo, colors)
- Shareable link for client access

### 6. Health Scoring
- Overall site health: 0-100%
- Per-string health scores
- Estimated power loss from detected defects (kW impact)
- Priority ranking of repairs

## Tech Stack
- **Frontend**: Next.js 14, Tailwind, Recharts
- **AI**: OpenAI Vision API (GPT-5-mini) for defect detection
- **Storage**: Convex (projects, defects, reports) + file uploads
- **Maps**: Mapbox for site location
- **PDF**: @react-pdf/renderer for report generation
- **Deploy**: Render (free tier)

## Data Model
```
Project: { id, name, location, date, panelCount, status, healthScore }
Upload: { id, projectId, filename, type (thermal|rgb), url, processedAt }
Defect: { id, projectId, uploadId, type, severity, location, description, confidence, tempDelta }
Report: { id, projectId, generatedAt, pdfUrl, shareToken }
```

## Revenue Model
- **Free tier**: 1 project, 10 images, basic report
- **Pro**: $49/mo — unlimited projects, branded reports, priority processing
- **Per-inspection**: $15-30 per inspection (pay-as-you-go option)
- **Enterprise**: Custom pricing for fleet operators

## MVP Scope (Tonight's Build)
1. ✅ Project CRUD
2. ✅ Image upload with preview
3. ✅ AI defect detection (OpenAI Vision)
4. ✅ Results dashboard with defect list
5. ✅ Panel health map (grid visualization)
6. ✅ PDF report generation
7. ❌ Convex backend (JSON storage for MVP, migrate later)
8. ❌ Auth (open for MVP)
9. ❌ Brandable reports (Phase 2)
10. ❌ Actual radiometric FLIR parsing (use Vision API on raw images for MVP)

## Success Metrics
- Can upload 10 thermal images and get defect report in <2 minutes
- Defect detection accuracy >80% on obvious hotspots
- PDF report looks professional enough to send to a client

## Competitive Advantage
- 10x cheaper than DroneDeploy/Raptor Maps
- No subscription required (pay-per-inspection option)
- Works with any drone thermal camera (DJI, FLIR, Autel)
- Generates client-ready reports, not just raw data
