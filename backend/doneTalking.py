#ML model to find when the user is done talking and ready for the next step

import numpy as np
import pyaudio
import torch
from silero_vad import load_silero_vad

# 1. Load the pre-trained Silero VAD model
model = load_silero_vad()

# 2. Audio Configuration (Silero expects 16kHz mono audio)
SAMPLE_RATE = 16000
CHUNK_SIZE = 512  # 512 samples = 32ms chunk at 16kHz
SILENCE_LIMIT_SEC = 2.0  # Pause duration to consider "done speaking"
SPEECH_THRESHOLD = 0.5  # Probability cutoff for active speech

# State tracking flags
has_started_speaking = False
silence_chunks = 0
max_silence_chunks = int((SILENCE_LIMIT_SEC * SAMPLE_RATE) / CHUNK_SIZE)

# 3. Setup Audio Stream
p = pyaudio.PyAudio()
stream = p.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=SAMPLE_RATE,
    input=True,
    frames_per_buffer=CHUNK_SIZE,
)

print("Listening... Start speaking into your mic.")

try:
    while True:
        # Read raw PCM bytes from mic and normalize to [-1.0, 1.0] float array
        raw_bytes = stream.read(CHUNK_SIZE, exception_on_overflow=False)
        audio_int16 = np.frombuffer(raw_bytes, dtype=np.int16)
        audio_float32 = audio_int16.astype(np.float32) / 32768.0

        # Run inference via Silero
        tensor_chunk = torch.from_numpy(audio_float32)
        speech_prob = model(tensor_chunk, SAMPLE_RATE).item()

        # Check if the chunk contains active speech
        if speech_prob > SPEECH_THRESHOLD:
            if not has_started_speaking:
                print("\n[Speech Detected] User started talking...")
                has_started_speaking = True
            silence_chunks = 0  # Reset silence counter while speaking
        else:
            if has_started_speaking:
                silence_chunks += 1
                # Trigger endpoint when silence threshold is reached
                if silence_chunks >= max_silence_chunks:
                    print("\n[EVENT: DONE SPEAKING] Triggering next action...")

                    # --- Reset state for next turn ---
                    has_started_speaking = False
                    silence_chunks = 0

except KeyboardInterrupt:
    print("\nStopping...")
finally:
    stream.stop_stream()
    stream.close()
    p.terminate()