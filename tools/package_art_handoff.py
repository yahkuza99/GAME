"""Commit a reviewable artwork handoff without sweeping all historical local captures."""
from pathlib import Path
import json,subprocess,hashlib
ROOT=Path(__file__).resolve().parents[1]
paths=set()
for directory in ['art/artwork-finish/review/native-valkyrie','art/artwork-finish/science-v2','art/artwork-finish/class3/warden-m']:
    paths.update(p.relative_to(ROOT).as_posix() for p in (ROOT/directory).rglob('*') if p.is_file())
status=json.loads((ROOT/'art/artwork-finish/review/STATUS.json').read_text())
for action in status['actions'].values():
    paths.add('art/artwork-finish/review/'+action['strip'])
paths.update(['art/artwork-finish/review/STATUS.json','art/artwork-finish/review/index.html','docs/AGENT_HANDOFF.md','tools/package_art_handoff.py'])
for path in paths:assert (ROOT/path).is_file(),path
assert all((ROOT/path).stat().st_size < 50_000_000 for path in paths)
out=ROOT/'art/artwork-finish/HANDOFF-PACKAGE.json'
report={'baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'acceptedRuntime':'Valkyrie female 10 actions, 8 directions, 208 cells. Runtime assets were already committed.','installedArtisticReviewOpen':'Science active artwork 48 skills; individual atlases installed, overall artistic acceptance remains open.','experimentalNotInstalled':'Warden male idle-eight-v1; do not use as runtime art.','historicalEvidence':'Existing recordings certify their recorded source versions; not a fresh recapture of new gameplay changes.','files':{p:{'bytes':(ROOT/p).stat().st_size,'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest()} for p in sorted(paths) if p!='docs/AGENT_HANDOFF.md'}}
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
paths.add(out.relative_to(ROOT).as_posix())
listing=ROOT/'art/integration-audit/ART-PACKAGE-PATHS.bin'
listing.write_bytes(b'\0'.join(p.encode() for p in sorted(paths))+b'\0')
subprocess.run(['git','add','--pathspec-from-file='+listing.relative_to(ROOT).as_posix(),'--pathspec-file-nul'],cwd=ROOT,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
print(json.dumps({'files':len(paths),'bytes':sum((ROOT/p).stat().st_size for p in paths),'acceptedMotionSets':1,'wardenAccepted':False}))
