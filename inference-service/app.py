"""Solar YOLO Inference API — Flask service for Render deployment."""
import os
import base64
import tempfile
import urllib.request
from pathlib import Path

os.environ["POLARS_SKIP_CPU_CHECK"] = "1"

from flask import Flask, request, jsonify
from ultralytics import YOLO

app = Flask(__name__)

MODEL_DIR = Path(__file__).parent / "model"
MODEL_PATH = MODEL_DIR / "best.pt"
MODEL_URL = "https://github.com/nztinversive/solar-inspection/releases/download/v0.1.0-model/best.pt"

# Download model on startup
if not MODEL_PATH.exists():
    MODEL_DIR.mkdir(exist_ok=True)
    print(f"Downloading model from {MODEL_URL}...")
    urllib.request.urlretrieve(MODEL_URL, str(MODEL_PATH))
    print(f"Downloaded {MODEL_PATH.stat().st_size / 1024 / 1024:.1f}MB")

model = YOLO(str(MODEL_PATH))
print("Model loaded successfully")

CLASS_MAP = {
    0: "hotspot",
    1: "hotspot",
    2: "bypass_diode",
    3: "string_failure",
    4: "crack",
    5: "soiling",
    6: "shading",
}

REMEDIATION = {
    "hotspot": ["Inspect affected cell for micro-cracks", "Check bypass diode functionality"],
    "crack": ["Schedule cell replacement", "Check for moisture ingress"],
    "soiling": ["Schedule panel cleaning", "Check drainage paths"],
    "string_failure": ["Check string inverter status", "Inspect combiner box wiring"],
    "bypass_diode": ["Test bypass diode with IV curve tracer", "Replace if shorted"],
    "shading": ["Trim vegetation", "Assess structural obstructions"],
}

def get_severity(defect_type, confidence):
    critical = {"string_failure", "bypass_diode"}
    if defect_type in critical and confidence > 0.4:
        return "critical"
    if confidence > 0.7:
        return "critical" if defect_type in critical else "warning"
    if confidence > 0.4:
        return "warning"
    return "info"


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    img_b64 = data.get("image", "")
    if "," in img_b64:
        img_b64 = img_b64.split(",", 1)[1]

    img_bytes = base64.b64decode(img_b64)

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

        return jsonify({"detections": detections})
    finally:
        os.unlink(tmp_path)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "solar-yolo-v1"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8765"))
    app.run(host="0.0.0.0", port=port)
