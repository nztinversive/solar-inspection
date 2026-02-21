"""Replicate Cog predictor for Solar Panel Defect Detection YOLO model."""
import os
os.environ["POLARS_SKIP_CPU_CHECK"] = "1"

from cog import BasePredictor, Input, Path as CogPath
from ultralytics import YOLO
from PIL import Image
import json

CLASS_NAMES = [
    "Hotspot", "Hotspot-Multi", "Bypass-Diode", "String-Failure",
    "Cracking", "Soiling", "Shadowing", "Delamination"
]


class Predictor(BasePredictor):
    def setup(self):
        """Load model weights."""
        self.model = YOLO("best.pt")

    def predict(
        self,
        image: CogPath = Input(description="Solar panel thermal or RGB image"),
        confidence: float = Input(description="Detection confidence threshold", default=0.25, ge=0.1, le=0.9),
        iou: float = Input(description="IoU threshold for NMS", default=0.45, ge=0.1, le=0.9),
    ) -> str:
        """Run defect detection on a solar panel image."""
        img = Image.open(str(image))
        results = self.model(img, conf=confidence, iou=iou, imgsz=640, verbose=False)

        detections = []
        for r in results:
            if r.boxes is None:
                continue
            for i in range(len(r.boxes)):
                cls_id = int(r.boxes.cls[i].item())
                conf = float(r.boxes.conf[i].item())
                x1, y1, x2, y2 = r.boxes.xyxyn[i].tolist()
                detections.append({
                    "class_id": cls_id,
                    "class_name": CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else f"class_{cls_id}",
                    "confidence": round(conf, 4),
                    "bbox": [round(x1, 4), round(y1, 4), round(x2, 4), round(y2, 4)],
                })

        return json.dumps({"detections": detections, "count": len(detections)})
