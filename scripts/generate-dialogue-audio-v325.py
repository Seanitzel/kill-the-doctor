"""Prepare the short local gunshot alarm using the existing fictional voices.
Run artifacts/audio-v5/venv/bin/python scripts/generate-dialogue-audio-v325.py.
No playback or paid service; the underlying workflow validates and stages takes.
"""
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('dialogue_workflow',ROOT/'scripts/generate-dialogue-audio-v320.py')
workflow=importlib.util.module_from_spec(spec)
spec.loader.exec_module(workflow)
workflow.WORK=ROOT/'artifacts/audio-v325'
workflow.LINES=[('What was that noise?!','alarmed-gunshot')]
if __name__=='__main__':workflow.main()
