# Pilot (AudioLDM2 only, one model -> less RAM): 2 nature ambience loops + 3 SFX.
# Ambience is saved as bgm_<theme>.wav so the game's existing bgm-file hook plays it instead of synth music.
# Model licence: cc-by-nc-sa-4.0 (non-commercial). Output -> OUT dir, not assets/.
import os, sys, time, torch, numpy as np, soundfile as sf
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
SR = 16000
from diffusers import AudioLDM2Pipeline
pipe = AudioLDM2Pipeline.from_pretrained(os.environ.get("ALDM2", "cvssp/audioldm2"), torch_dtype=torch.float16, low_cpu_mem_usage=True).to("cuda")
# transformers 5.x: ClapModel.get_text_features returns an output object, diffusers 0.36 expects a tensor
_gtf = pipe.text_encoder.get_text_features
def _gtf_tensor(*a, **k):
    r = _gtf(*a, **k)
    return r if torch.is_tensor(r) else (getattr(r, "text_embeds", None) if getattr(r, "text_embeds", None) is not None else r.pooler_output)
pipe.text_encoder.get_text_features = _gtf_tensor
neg = "music, melody, instrument, speech, voice, low quality, distortion"

def gen(prompt, secs, seed):
    g = torch.Generator("cuda").manual_seed(seed)
    return pipe(prompt, negative_prompt=neg, num_inference_steps=100, audio_length_in_s=secs, generator=g).audios[0]

def make_loop(a, xf=SR * 1):
    # crossfade tail into head so the clip loops without a click
    head, tail = a[:xf], a[-xf:]
    ramp = np.linspace(0, 1, xf, dtype=np.float32)
    body = a[xf:-xf] if len(a) > 2 * xf else a[xf:]
    return np.concatenate([tail * (1 - ramp) + head * ramp, body]).astype(np.float32)

ambience = {
  "field": "open grassy meadow ambience, gentle wind through grass, distant songbirds, insects, peaceful nature, no music",
  "cave":  "deep cave ambience, slow water drips echoing, low rumble, faint wind in tunnels, no music",
}
for name, p in ambience.items():
    t = time.time()
    a = make_loop(gen(p, 12.0, 11))
    sf.write(os.path.join(OUT, f"bgm_{name}.wav"), a, SR); print(f"bgm_{name} {len(a)/SR:.1f}s {time.time()-t:.0f}s", flush=True)

sfx = {
  "hit":     "metal sword hitting robot armor, single short heavy clang impact, sound effect",
  "pickup":  "single short bright metallic coin pickup chime, sound effect",
  "levelup": "short magical sparkle whoosh rising upward with shimmering chimes, sound effect",
}
for name, p in sfx.items():
    t = time.time()
    sf.write(os.path.join(OUT, f"sfx_{name}.wav"), gen(p, 2.0, 7), SR); print(f"sfx_{name} {time.time()-t:.0f}s", flush=True)
