from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import torch
import numpy as np
from ultralytics import YOLO
import time
import json
from io import StringIO

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

class ObjectDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        self.models = {
            'yolov8n': YOLO("yolov8n.pt").to(self.device),
            'yolov8s': YOLO("yolov10n.pt").to(self.device),
            'yolov8m': YOLO("yolov10s.pt").to(self.device)
        }
        self.current_model = 'yolov8n'
        self.logs = []

    @torch.no_grad()
    def detect(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_resized = cv2.resize(frame_rgb, (640, 640))
        frame_normalized = frame_resized.astype(np.float32) / 255.0
        frame_tensor = torch.from_numpy(frame_normalized).permute(2, 0, 1).unsqueeze(0).to(self.device)

        results = self.models[self.current_model](frame_tensor)

        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                class_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                detections.append({
                    "class": self.models[self.current_model].names[class_id],
                    "confidence": round(conf, 2),
                    "box": [int(x1.item()), int(y1.item()), int(x2.item()), int(y2.item())]
                })

        # Log the detection
        log_entry = {
            "timestamp": time.time(),
            "model": self.current_model,
            "detections": detections
        }
        self.logs.append(log_entry)
        
        # Keep only the last 1000 logs
        if len(self.logs) > 1000:
            self.logs = self.logs[-1000:]

        return detections

detector = ObjectDetector()

@app.route('/detect', methods=['POST'])
def detect_objects():
    file = request.files['image']
    img_array = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    detections = detector.detect(img)
    return jsonify(detections)

@app.route('/switch_model', methods=['POST'])
def switch_model():
    model_name = request.json['model']
    if model_name in detector.models:
        detector.current_model = model_name
        return jsonify({"message": f"Switched to {model_name}"})
    else:
        return jsonify({"error": "Invalid model name"}), 400

@app.route('/models', methods=['GET'])
def list_models():
    return jsonify(list(detector.models.keys()))

@app.route('/logs', methods=['GET'])
def get_logs():
    return jsonify(detector.logs)


@app.route('/download_logs', methods=['GET'])
def download_logs():
    logs_json = json.dumps(detector.logs, indent=2)
    buffer = BytesIO(logs_json.encode())
    buffer.seek(0)
    return send_file(buffer, 
                     mimetype='application/json', 
                     as_attachment=True, 
                     download_name='detection_logs.json')
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)