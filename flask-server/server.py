from flask import Flask, render_template, Response
import cv2
import requests
import numpy as np

app = Flask(__name__)

def generate_frames():
    camera = cv2.VideoCapture(0)  # or your video source
    while True:
        success, frame = camera.read()
        if not success:
            break
        else:
            # Encode frame to send to detection service
            _, img_encoded = cv2.imencode('.jpg', frame)
            
            # Send frame to detection service
            response = requests.post('http://localhost:5001/detect', 
                                     files={'image': ('frame.jpg', img_encoded.tobytes(), 'image/jpeg')})
            
            detections = response.json()
            
            # Draw detections on the frame
            for det in detections:
                x1, y1, x2, y2 = det['box']
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f"{det['class']} {det['confidence']:.2f}", (x1, y1 - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            
            # Encode the frame with detections
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/switch_model/<model_name>', methods=['POST'])
def switch_model(model_name):
    response = requests.post('http://localhost:5001/switch_model', json={'model': model_name})
    return response.json()

@app.route('/models', methods=['GET'])
def list_models():
    response = requests.get('http://localhost:5001/models')
    return response.json()

if __name__ == '__main__':
    app.run(debug=True, port=5000)