from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import whisper
import os
import torch

app = Flask(__name__)
CORS(app)  # Enable CORS

device = "cuda" if torch.cuda.is_available() else "cpu"
if device == "cuda":
    print("Using GPU for transcription.")
else:
    print("Using CPU for transcription.")

# Load Whisper model
model = whisper.load_model("small", device=device)

# Ensure directories for file storage
UPLOAD_FOLDER = "uploads"
SRT_FOLDER = "srt_files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SRT_FOLDER, exist_ok=True)

# Route to handle file upload and transcription
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Save the uploaded file
    audio_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(audio_path)

    # Generate the SRT file
    try:
        srt_file = transcribe_audio_to_srt(audio_path)
        return jsonify({"message": "Transcription complete", "srt_file": srt_file})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Function to transcribe audio and create SRT
def transcribe_audio_to_srt(audio_path):
    result = model.transcribe(audio_path)
    srt_filename = os.path.join(SRT_FOLDER, os.path.basename(audio_path) + ".srt")
    
    with open(srt_filename, "w", encoding="utf-8") as srt_file:
        for i, segment in enumerate(result["segments"], start=1):
            start = segment["start"]
            end = segment["end"]
            text = segment["text"].strip()

            def format_time(t):
                h = int(t // 3600)
                m = int((t % 3600) // 60)
                s = int(t % 60)
                ms = int((t % 1) * 1000)
                return f"{h:02}:{m:02}:{s:02},{ms:03}"

            srt_file.write(f"{i}\n")
            srt_file.write(f"{format_time(start)} --> {format_time(end)}\n")
            srt_file.write(f"{text}\n\n")
    
    return os.path.basename(srt_filename)

# Route to serve the generated SRT file
@app.route('/api/srt/<filename>')
def get_srt(filename):
    return send_from_directory(SRT_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
