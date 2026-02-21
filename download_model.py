"""Download solar YOLO model weights for deployment."""
import os
import urllib.request
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "model"
MODEL_PATH = MODEL_DIR / "best.pt"

# GitHub release URL (update after uploading)
MODEL_URL = os.environ.get(
    "SOLAR_MODEL_URL",
    ""  # Set this env var on Render to the actual download URL
)

def download():
    if MODEL_PATH.exists():
        size_mb = MODEL_PATH.stat().st_size / 1024 / 1024
        print(f"Model already exists ({size_mb:.1f}MB)")
        return

    if not MODEL_URL:
        print("No MODEL_URL set — running in mock/OpenAI-only mode")
        return

    MODEL_DIR.mkdir(exist_ok=True)
    print(f"Downloading model from {MODEL_URL}...")
    urllib.request.urlretrieve(MODEL_URL, str(MODEL_PATH))
    size_mb = MODEL_PATH.stat().st_size / 1024 / 1024
    print(f"Downloaded {size_mb:.1f}MB to {MODEL_PATH}")

if __name__ == "__main__":
    download()
