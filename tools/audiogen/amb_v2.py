# Ambience v2: richer prompts, 20 s, 3 CLAP-ranked takes per scene, soft post-processing (stereo, de-hiss, light reverb).
import os, sys, time, subprocess, torch, numpy as np, soundfile as sf
OUT = sys.argv[1]; only = sys.argv[2:] ; os.makedirs(OUT, exist_ok=True)
SR = 16000
SCENES = {
 "town":   "peaceful morning in a small nordic village, gentle breeze, soft birdsong, distant friendly chatter, a far away anvil, calm and pleasant, high quality field recording",
 "field":  "beautiful sunny meadow, soft warm wind through tall grass, many sweet songbirds singing, gentle crickets, relaxing and pleasant, high quality field recording",
 "lake":   "tranquil misty lake at dawn, gentle small waves lapping softly on the shore, calm breeze, distant loons and water birds, soothing, high quality field recording",
 "forest": "serene deep forest, leaves gently rustling, a soft stream trickling, wood thrush and cuckoo singing, peaceful and magical, high quality field recording",
 "cave":   "calm mysterious cave, slow gentle water drops echoing softly, a quiet underground stream, soft airy wind, peaceful, high quality field recording",
}
NEG = "music, melody, instrument, speech, talking, harsh noise, static, hiss, distortion, low quality, loud"
from diffusers import AudioLDM2Pipeline
pipe = AudioLDM2Pipeline.from_pretrained(os.environ.get("ALDM2", "cvssp/audioldm2"), torch_dtype=torch.float16, low_cpu_mem_usage=True).to("cuda")

def make_loop(a, xf=SR * 2):
    ramp = np.sqrt(np.linspace(0, 1, xf, dtype=np.float32))           # equal-power crossfade
    return np.concatenate([a[-xf:] * ramp[::-1] + a[:xf] * ramp, a[xf:-xf]]).astype(np.float32)

for name, prompt in SCENES.items():
    if only and name not in only: continue
    t = time.time()
    takes = pipe(prompt, negative_prompt=NEG, num_inference_steps=150, guidance_scale=4.0, audio_length_in_s=20.0,
                 num_waveforms_per_prompt=3, generator=torch.Generator("cuda").manual_seed(21)).audios   # ranked by CLAP, best first
    for i, a in enumerate(takes, 1):
        wav = os.path.join(OUT, f"_tmp_{name}_{i}.wav"); sf.write(wav, make_loop(a), SR)
        # de-rumble + de-hiss, pseudo-stereo (Haas 14 ms), gentle room reverb, loudness for background bed
        af = ("highpass=f=70,lowpass=f=6500,afftdn=nf=-30,"
              "pan=stereo|c0=c0|c1=c0,adelay=0|14,"
              "aecho=0.8:0.6:60|110:0.18|0.12,"
              "loudnorm=I=-20:TP=-2")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", af, "-ar", "44100",
                        "-c:a", "libvorbis", "-q:a", "6", os.path.join(OUT, f"bgm_{name}_v{i}.ogg")], check=True)
        os.remove(wav)
    print(f"{name}: 3 takes {time.time()-t:.0f}s", flush=True)
