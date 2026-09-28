#!/usr/bin/env python3
"""Rebuild everything: the interactive homepage and the research report."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent
for script in ['tools/build_story.py', 'tools/build_report.py']:
    subprocess.run([sys.executable, str(root / script)], check=True, cwd=root)
print('Site rebuilt.')
