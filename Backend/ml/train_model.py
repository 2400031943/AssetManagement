"""
train_model.py
--------------
Train a TF-IDF + SVM (LinearSVC) classifier on the ACMS category dataset
and save the model pipeline to  ml/category_model.pkl
Run:  python Backend/ml/train_model.py
"""

import os
import sys
import joblib

# ── allow import from parent Backend dir ──────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from category_dataset import TRAINING_DATA, CATEGORY_DISPLAY

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import cross_val_score
import numpy as np

# ── Prepare data ──────────────────────────────────────────────────────────────
texts  = [t for t, _ in TRAINING_DATA]
labels = [l for _, l in TRAINING_DATA]

print(f"[INFO] Dataset: {len(texts)} samples across {len(set(labels))} categories")
for lbl in sorted(set(labels)):
    count = labels.count(lbl)
    print(f"       {lbl:<20} {count} samples")

# ── Build pipeline ────────────────────────────────────────────────────────────
# TF-IDF: character n-grams + word n-grams give good coverage for tech text
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 3),          # unigrams + bigrams + trigrams
        analyzer='word',
        min_df=1,
        sublinear_tf=True,           # log normalization
        strip_accents='unicode',
    )),
    ('clf', CalibratedClassifierCV(
        LinearSVC(max_iter=5000, C=1.0),
        cv=3,
    )),
])

# ── Cross-validation ──────────────────────────────────────────────────────────
print("\n[INFO] Running 5-fold cross-validation …")
scores = cross_val_score(pipeline, texts, labels, cv=5, scoring='accuracy')
print(f"[INFO] CV Accuracy: {scores.mean():.3f} ± {scores.std():.3f}")

# ── Train on full dataset ─────────────────────────────────────────────────────
pipeline.fit(texts, labels)
print("[INFO] Model trained on full dataset.")

# ── Save model ────────────────────────────────────────────────────────────────
out_path = os.path.join(os.path.dirname(__file__), 'category_model.pkl')
joblib.dump({
    'pipeline':         pipeline,
    'category_display': CATEGORY_DISPLAY,
    'labels':           sorted(set(labels)),
}, out_path)
print(f"[INFO] Model saved -> {out_path}")

# ── Quick smoke test ──────────────────────────────────────────────────────────
test_cases = [
    ("HP thin client t640 VDI endpoint",                     "PC Type-1"),
    ("Core 2 duo desktop 4GB RAM",                           "PC Type-2"),
    ("Dell OptiPlex i7 desktop",                             "PC Type-3"),
    ("HP EliteBook laptop i5 SSD",                           "PC Type-4"),
    ("LTO tape drive standalone",                            "SP Type-1"),
    ("A0 plotter CAD wide format",                           "SP Type-2"),
    ("Black and white A4 laser printer",                     "Printer Type-1"),
    ("Color multifunction printer A4 MFP",                   "Printer Type-2"),
    ("A3 heavy duty copier printer",                         "Printer Type-3"),
    ("Workstation Quadro 2GB GPU",                           "WS Type-1"),
    ("HP Z8 workstation RTX 16GB graphics",                  "WS Type-2"),
    ("Dell PowerEdge R730 rack server",                      "Server Type-1"),
    ("Blade chassis HP c7000 4 CPU server",                  "Server Type-2"),
    ("QNAP portable NAS storage",                            "Storage Type-1"),
    ("NetApp SAN storage 80TB",                              "Storage Type-2"),
    ("EMC VMAX 200TB large storage",                         "Storage Type-3"),
    ("Petabyte scale SAN storage 600TB",                     "Storage Type-4"),
    ("Cisco gigabit 1000Mbps switch 48 port",                "NW Type-1"),
    ("Gigabit switch with 10G SFP uplink module",            "NW Type-2"),
    ("Cisco Nexus TOR 10G standalone switch",                "NW Type-3"),
    ("Arista 100G standalone switch",                        "NW Type-4"),
    ("Cisco Nexus 7000 chassis core switch",                 "NW Type-5"),
    ("Palo Alto firewall security appliance",                "NW Type-6"),
]

print("\n[INFO] Smoke test:")
correct = 0
for text, expected in test_cases:
    pred = pipeline.predict([text])[0]
    prob = pipeline.predict_proba([text])[0]
    conf = max(prob) * 100
    ok = "OK" if pred == expected else "XX"
    if pred == expected:
        correct += 1
    print(f"  {ok} [{conf:5.1f}%] {pred:<20} (expected: {expected}) -- '{text[:55]}'")

print(f"\n[RESULT] Smoke test: {correct}/{len(test_cases)} correct ({correct/len(test_cases)*100:.0f}%)")
print("[DONE] Ready for deployment.")
