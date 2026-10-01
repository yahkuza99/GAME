# Generate every sound in prompts.json that has no .ogg yet in OUT. Usage: gen_all.py OUT [max_count]
import os, sys, json, time, subprocess, torch, numpy as np, soundfile as sf
OUT = sys.argv[1]; MAXN = int(sys.argv[2]) if len(sys.argv) > 2 else 999
SR = 16000
todo = {k: v for k, v in json.load(open(os.path.join(os.path.dirname(__file__), "prompts.json"), encoding="utf-8")).items()
        if not os.path.exists(os.path.join(OUT, k + ".ogg"))}
print(f"todo {len(todo)}", flush=True)
if not todo: sys.exit(0)
from diffusers import AudioLDM2Pipeline
pipe = AudioLDM2Pipeline.from_pretrained(os.environ.get("ALDM2", "cvssp/audioldm2"), torch_dtype=torch.float16, low_cpu_mem_usage=True).to("cuda")
NEG_AMB = "music, melody, instrument, speech, voice, low quality, distortion"
NEG_SFX = "music, melody, speech, voice, background noise, low quality, distortion"

def make_loop(a, xf=SR):
    head, tail = a[:xf], a[-xf:]; ramp = np.linspace(0, 1, xf, dtype=np.float32)
    return np.concatenate([tail * (1 - ramp) + head * ramp, a[xf:-xf]]).astype(np.float32)

def trim(a, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx): return a
    end = min(len(a), idx[-1] + int(SR * 0.08))
    a = a[max(0, idx[0] - int(SR * 0.005)):end]
    fade = min(len(a), int(SR * 0.03)); a[-fade:] *= np.linspace(1, 0, fade)
    return a

for i, (name, (secs, prompt)) in enumerate(todo.items()):
    if i >= MAXN: break
    t = time.time(); amb = name.startswith("bgm_")
    a = pipe(prompt, negative_prompt=NEG_AMB if amb else NEG_SFX, num_inference_steps=100,
             audio_length_in_s=max(float(secs), 1.0), generator=torch.Generator("cuda").manual_seed(7)).audios[0]
    a = make_loop(a) if amb else trim(a)
    wav = os.path.join(OUT, name + ".wav"); sf.write(wav, a, SR)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", "loudnorm=I=-18:TP=-1.5" if amb else "loudnorm=I=-16:TP=-1.0",
                    "-ar", "44100", "-c:a", "libvorbis", "-q:a", "5", os.path.join(OUT, name + ".ogg")], check=True)
    os.remove(wav)
    print(f"{name} {len(a)/SR:.1f}s {time.time()-t:.0f}s", flush=True)
