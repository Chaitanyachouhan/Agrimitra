# # filepath: c:\Users\Sahil Kumar\Desktop\Crop\model_api.py
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import numpy as np
# from PIL import Image
# import base64
# from io import BytesIO
# import json
# import tensorflow as tf
# from tensorflow.keras.models import load_model
# import os

# app = Flask(__name__)
# CORS(app)

# # === Config ===
# MODEL_PATH = r"C:\Users\Sahil Kumar\Desktop\Crop\plant_disease_model_full.h5"
# LABELS_PATH = r"C:\Users\Sahil Kumar\Desktop\Crop\label_map.json"
# IMG_SIZE = (224, 224)
# TOP_K = 3

# # === Load model and labels ===
# if not os.path.exists(MODEL_PATH):
#     raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
# model = load_model(MODEL_PATH)
# print("Loaded model:", MODEL_PATH)

# if not os.path.exists(LABELS_PATH):
#     raise FileNotFoundError(f"Labels file not found at {LABELS_PATH}")
# with open(LABELS_PATH, "r") as f:
#     label_map = json.load(f)
# print(f"Loaded {len(label_map)} labels")

# # === Preprocess function ===
# def preprocess_image_from_base64(base64_string):
#     """
#     Accepts base64 (without data:<mime>;base64, prefix OR with it) and returns
#     a preprocessed batch ready for model.predict: shape (1, 224,224,3)
#     """
#     # If input includes the data URI prefix, strip it
#     if base64_string.startswith("data:"):
#         base64_string = base64_string.split(",", 1)[1]

#     img_bytes = base64.b64decode(base64_string)
#     img = Image.open(BytesIO(img_bytes)).convert("RGB")  # ensure RGB
#     img = img.resize(IMG_SIZE, Image.BILINEAR)
#     arr = np.asarray(img).astype("float32")

#     # --- IMPORTANT: Match training preprocessing ---
#     # YOUR TRAINING: used `image = image / 255.0` (range 0-1)
#     arr = arr / 255.0

#     # If you actually trained with MobileNetV2's preprocess_input ([-1,1]),
#     # replace the above line with:
#     # from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
#     # arr = preprocess_input(arr)

#     arr = np.expand_dims(arr, axis=0)  # shape (1, H, W, 3)
#     return arr

# # === Prediction endpoint ===
# @app.route("/predict", methods=["POST"])
# def predict():
#     try:
#         data = request.get_json(force=True)
#         if not data or "image" not in data:
#             return jsonify({"error": "No image provided. Send JSON with key 'image' (base64 string)."}), 400

#         batch = preprocess_image_from_base64(data["image"])
#         preds = model.predict(batch)  # shape (1, num_classes)
#         preds = preds[0]  # (num_classes,)

#         top_indices = preds.argsort()[-TOP_K:][::-1]
#         top_probs = preds[top_indices].tolist()
#         top_labels = [label_map[str(i)] if str(i) in label_map else label_map[int(i)] for i in top_indices]

#         response = {
#             "top_k": TOP_K,
#             "predictions": [
#                 {"index": int(idx), "label": lbl, "confidence": float(prob)}
#                 for idx, lbl, prob in zip(top_indices.tolist(), top_labels, top_probs)
#             ],
#             # include raw logits/probs if helpful (beware of large JSONs)
#             "raw_probabilities": preds.tolist()
#         }
#         return jsonify(response)
#     except Exception as e:
#         # Return the error message to help debugging; remove stack trace in production
#         return jsonify({"error": str(e)}), 500

# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5000, debug=True)


# backend/model_api.py
"""
Robust model loader + prediction API.

Behavior:
- Attempts tf.keras.models.load_model(MODEL_PATH) first.
- If that fails, inspects the .h5 file with h5py to detect if it likely contains weights-only.
- If weights-only (or load_model failed), it will reconstruct the model architecture
  (matching your training code) and attempt model.load_weights(MODEL_PATH).
- Returns top-k predictions and raw probabilities.

IMPORTANT:
- Update DEFAULT_MODEL_CANDIDATES and DEFAULT_LABEL_CANDIDATES if your files are in different places.
- Ensure label_map.json exists and is the same ordering as during training.
- This script assumes training preprocessing was: img = img / 255.0 (range [0,1]).
  If you trained with MobileNetV2 preprocess_input ([-1,1]), swap that line accordingly.
"""
import os
import json
import base64
from io import BytesIO

from PIL import Image
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

# optional inspector
try:
    import h5py
except Exception:
    h5py = None

import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2

app = Flask(__name__)
CORS(app)

# ---------------- CONFIG ----------------
DEFAULT_MODEL_CANDIDATES = [
    os.environ.get("MODEL_PATH"),
    os.path.join(os.path.dirname(__file__), "..", "models", "plant_disease_model_full.h5"),
    os.path.join(os.path.dirname(__file__), "..", "models", "plant_disease_model.h5"),
    r"D:\crops\plant_disease_model.h5",
    r"D:\crops\plant_disease_model.h5",
]

DEFAULT_LABEL_CANDIDATES = [
    os.environ.get("LABELS_PATH"),
    os.path.join(os.path.dirname(__file__), "..", "models", "label_map.json"),
    os.path.join(os.path.dirname(__file__), "..", "label_map.json"),
    r"D:\crops\label_map.json",
]

IMG_SIZE = (224, 224)
TOP_K = 3
# ----------------------------------------

def find_existing_path(candidates):
    for p in candidates:
        if p and os.path.exists(p):
            return os.path.abspath(p)
    return None

MODEL_PATH = find_existing_path(DEFAULT_MODEL_CANDIDATES)
LABELS_PATH = find_existing_path(DEFAULT_LABEL_CANDIDATES)

if MODEL_PATH is None:
    raise FileNotFoundError("Model file not found. Set MODEL_PATH env var or put model under ../models/")

if LABELS_PATH is None:
    raise FileNotFoundError("Labels file not found. Set LABELS_PATH env var or put label_map.json under ../models/")

print("MODEL_PATH =", MODEL_PATH)
print("LABELS_PATH =", LABELS_PATH)

# load labels
with open(LABELS_PATH, "r", encoding="utf-8") as f:
    label_map = json.load(f)
num_classes = len(label_map)
print(f"Loaded {num_classes} labels (first 10): {label_map[:10]}")

model = None

def inspect_h5(path):
    """
    Return a dict describing what's inside the HDF5 file (if h5py available).
    Useful to detect 'model_config' (full model) vs weights-only.
    """
    info = {}
    if h5py is None:
        info['h5py_available'] = False
        return info
    info['h5py_available'] = True
    try:
        with h5py.File(path, 'r') as f:
            info['keys'] = list(f.keys())
            # legacy full-model HDF5 has 'model_config' or attr 'model_config'
            info['has_model_config'] = 'model_config' in f.attrs or 'model_config' in f.keys()
            info['has_model_weights'] = 'model_weights' in f.keys()
            # list groups under model_weights if present (rough idea of layers)
            if 'model_weights' in f:
                info['weights_layers'] = list(f['model_weights'].keys())[:10]
    except Exception as e:
        info['error'] = str(e)
    return info

# Try load_model first (preferred)
try:
    print("Attempting tf.keras.models.load_model(...)")
    model = load_model(MODEL_PATH)
    print("load_model(...) succeeded.")
except Exception as e_load:
    print("load_model failed with exception:", repr(e_load))
    # inspect h5
    info = inspect_h5(MODEL_PATH)
    print("HDF5 inspect:", info)

    # Attempt to reconstruct architecture and load weights (weights-only or fallback)
    print("Attempting to reconstruct architecture and load_weights(...) as fallback.")

    def create_model_architecture():
        """
        Recreate the model architecture you used during training.
        Must match training architecture exactly.
        """
        # Data augmentation used in training
        data_augmentation = tf.keras.Sequential(
            [
                layers.RandomFlip("horizontal"),
                layers.RandomRotation(0.1),
                layers.RandomZoom(0.1),
            ],
            name="data_augmentation",
        )

        # Base model — during training you most likely used weights='imagenet'
        base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3))
        base_model.trainable = False

        model_local = tf.keras.Sequential(
            [
                layers.Input(shape=(IMG_SIZE[0], IMG_SIZE[1], 3)),
                data_augmentation,
                base_model,
                layers.GlobalAveragePooling2D(),
                layers.Dense(256, activation='relu'),
                layers.Dropout(0.5),
                layers.Dense(num_classes, activation='softmax'),
            ],
            name="plant_disease_model_reconstructed",
        )
        # compile in the same way as training (optimizer/loss don't matter for predict but compile helps)
        model_local.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        return model_local

    try:
        model = create_model_architecture()
        print("Reconstructed model architecture. Now attempting load_weights(...)")
        model.load_weights(MODEL_PATH)
        print("load_weights(...) succeeded.")
    except Exception as e_weights:
        print("Reconstructed load_weights failed:", repr(e_weights))
        # final fallback: try to load model (again) but with compile=False
        try:
            print("Final attempt: load_model(..., compile=False)")
            model = load_model(MODEL_PATH, compile=False)
            print("load_model(..., compile=False) succeeded.")
        except Exception as e_final:
            # nothing worked — raise a helpful error
            raise RuntimeError(
                "Failed to load model (both load_model and reconstructed load_weights attempts failed). "
                "See below for errors.\n"
                f"load_model error: {repr(e_load)}\n"
                f"load_weights error: {repr(e_weights)}\n"
                f"final load_model(compile=False) error: {repr(e_final)}\n"
                "If you have access to the training environment, re-save the model using model.save('model_dir') "
                "or model.save('path_to_h5.h5') with current TF and provide label_map.json. "
                "Alternatively, re-export the model in the TensorFlow SavedModel format."
            )

# At this point `model` should be loaded or an exception already thrown
print("Model ready. Summary (first layers):")
try:
    model.summary()
except Exception:
    print("Could not print model.summary() for some model types.")

# ----------------- Prediction utilities -----------------
def preprocess_image_from_base64(base64_string):
    # Accept either data URI or raw base64
    if base64_string.startswith("data:"):
        base64_string = base64_string.split(",", 1)[1]
    try:
        img_bytes = base64.b64decode(base64_string)
    except Exception as ex:
        raise ValueError("Invalid base64 image data") from ex

    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE, Image.BILINEAR)
    arr = np.asarray(img).astype("float32")

    # MATCH TRAINING: in your training script image = image / 255.0
    arr = arr / 255.0

    # If you actually trained with MobileNetV2 preprocess_input, replace above line:
    # from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    # arr = preprocess_input(arr)

    arr = np.expand_dims(arr, axis=0)  # shape (1, H, W, 3)
    return arr

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": os.path.basename(MODEL_PATH), "labels": num_classes})

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)
        if not data or "image" not in data:
            return jsonify({"error": "No image provided. Send JSON with key 'image' (base64 or data URI)."}), 400

        batch = preprocess_image_from_base64(data["image"])
        preds = model.predict(batch)
        preds = np.asarray(preds).flatten()

        top_idx = preds.argsort()[-TOP_K:][::-1]
        top_probs = preds[top_idx].tolist()
        top_labels = [label_map[int(i)] for i in top_idx.tolist()]

        resp_preds = []
        for idx, lbl, prob in zip(top_idx.tolist(), top_labels, top_probs):
            resp_preds.append({"index": int(idx), "label": lbl, "confidence": float(prob)})

        return jsonify({"top_k": TOP_K, "predictions": resp_preds, "raw_probabilities": preds.tolist()})
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500

if __name__ == "__main__":
    # Debug mode only for development
    app.run(host="0.0.0.0", port=5000, debug=True)
