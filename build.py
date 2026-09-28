#!/usr/bin/env python3
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parent
for file in ['source/report-original/build.py','tools/build_report.py','tools/build_story.py']:
    subprocess.run([sys.executable,str(root/file)],check=True,cwd=root)
print('Offline bilingual site rebuilt successfully.')
