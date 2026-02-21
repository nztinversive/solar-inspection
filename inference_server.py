"""
Solar Panel Defect Detection - YOLO Inference Server
Runs alongside the Next.js app, accepts base64 images, returns detections.
"""
import os
os.environ["POLARS_SKIP_CPU_CHECK"] = "1"

import base64
import io
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

from PIL import Image
from ultralytics import YOLO

# Find best weights
WEIGHTS_DIR = Path(__file__).parent.parent / "solar-yolo-training" / "runs" / "solar_defects_v1" / "weights"
BEST_WEIGHTS = WEIGHTS_DIR / "best.pt"
LAST_WEIGHTS = WEIGHTS_DIR / "last.pt"

MODEL_PATH = str(BEST_WEIGHTS if BEST_WEIGHTS.exists() else LAST_WEIGHTS)
PORT = int(os.environ.get("YOLO_PORT", "8765"))
CONF_THRESHOLD = 0.25

CLASS_NAMES = [
    "Hotspot", "Hotspot-Multi", "Bypass-Diode", "String-Failure",
    "Cracking", "Soiling", "Shadowing", "Delamination"
]

print(f"Loading model from: {MODEL_PATH}")
model = YOLO(MODEL_PATH)
print("Model loaded!")


class InferenceHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/detect":
            self.send_error(404)
            return
        
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)
        
        # Decode base64 image
        image_b64 = data.get("image", "")
        if image_b64.startswith("data:"):
            image_b64 = image_b64.split(",", 1)[1]
        
        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Run inference
        results = model(image, conf=CONF_THRESHOLD, imgsz=640, verbose=False)
        
        detections = []
        for r in results:
            boxes = r.boxes
            if boxes is None:
                continue
            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf = float(boxes.conf[i].item())
                # Normalize bbox to 0-1 range
                x1, y1, x2, y2 = boxes.xyxyn[i].tolist()
                detections.append({
                    "class_id": cls_id,
                    "class_name": CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else f"class_{cls_id}",
                    "confidence": round(conf, 4),
                    "bbox": [round(x1, 4), round(y1, 4), round(x2, 4), round(y2, 4)],
                })
        
        response = json.dumps({"detections": detections, "count": len(detections)})
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(response.encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": MODEL_PATH}).encode())
        else:
            self.send_error(404)
    
    def log_message(self, format, *args):
        print(f"[inference] {args[0]}")


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), InferenceHandler)
    print(f"Solar YOLO inference server running on port {PORT}")
    server.serve_forever()
