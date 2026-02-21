"""
Solar Panel Defect Detection - YOLO Inference Server
Loads best.pt and serves predictions via HTTP POST /predict
"""
import os
import sys
import json
import base64
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

os.environ["POLARS_SKIP_CPU_CHECK"] = "1"

from ultralytics import YOLO

# Model path — check local first, then workspace training dir
MODEL_PATHS = [
    Path(__file__).parent / "model" / "best.pt",
    Path.home() / ".openclaw" / "workspace" / "solar-yolo-training" / "runs" / "solar_defects_v1" / "weights" / "best.pt",
]

model = None
for p in MODEL_PATHS:
    if p.exists():
        print(f"Loading model from {p}")
        model = YOLO(str(p))
        break

if model is None:
    print("ERROR: No model found at any expected path")
    sys.exit(1)

# YOLO class index → defect type mapping
CLASS_MAP = {
    0: "hotspot",
    1: "hotspot",       # Hotspot-Multi → hotspot
    2: "bypass_diode",
    3: "string_failure",
    4: "crack",
    5: "soiling",
    6: "shading",
}

# Severity logic based on confidence + type
def get_severity(defect_type: str, confidence: float) -> str:
    critical_types = {"string_failure", "bypass_diode"}
    if defect_type in critical_types and confidence > 0.4:
        return "critical"
    if confidence > 0.7:
        return "critical" if defect_type in critical_types else "warning"
    if confidence > 0.4:
        return "warning"
    return "info"

REMEDIATION = {
    "hotspot": ["Inspect affected cell for micro-cracks", "Check bypass diode functionality", "Monitor in next cycle"],
    "crack": ["Schedule cell replacement", "Check for moisture ingress", "Measure IV curve"],
    "soiling": ["Schedule panel cleaning", "Check drainage paths"],
    "string_failure": ["Check string inverter status", "Inspect combiner box wiring", "Measure string voltage"],
    "bypass_diode": ["Test bypass diode with IV curve tracer", "Replace if shorted", "Check junction box"],
    "shading": ["Trim vegetation", "Assess structural obstructions", "Consider panel relocation"],
}


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/predict":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)

        # Accept base64 image (with or without data URL prefix)
        img_b64 = data.get("image", "")
        if "," in img_b64:
            img_b64 = img_b64.split(",", 1)[1]

        img_bytes = base64.b64decode(img_b64)

        # Write to temp file for YOLO
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(img_bytes)
            tmp_path = f.name

        try:
            results = model.predict(tmp_path, conf=0.15, imgsz=640, verbose=False)
            detections = []

            for r in results:
                if r.boxes is None:
                    continue
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()

                    defect_type = CLASS_MAP.get(cls_id, "hotspot")
                    severity = get_severity(defect_type, conf)

                    detections.append({
                        "type": defect_type,
                        "severity": severity,
                        "confidence": round(conf, 3),
                        "bbox": [round(v, 1) for v in xyxy],
                        "description": f"YOLO detected {defect_type.replace('_', ' ')} (conf: {conf:.0%})",
                        "remediation": REMEDIATION.get(defect_type, ["Schedule inspection"]),
                    })

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detections": detections}).encode())
        finally:
            os.unlink(tmp_path)

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": "solar-yolo-v1"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        print(f"[inference] {args[0]}")


if __name__ == "__main__":
    port = int(os.environ.get("INFERENCE_PORT", "8765"))
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"Solar YOLO inference server running on http://127.0.0.1:{port}")
    server.serve_forever()
