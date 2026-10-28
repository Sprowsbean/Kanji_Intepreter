"""Create (or update) the backend's Hugging Face Space and upload the backend files.

One-time: log in with a *write* token from https://huggingface.co/settings/tokens
    hf auth login
Then, from backend/:
    venv\\Scripts\\python deploy_space.py [space-name]        (default name: kanji-interpreter)
The Space builds the Dockerfile on Hugging Face's servers (a few minutes the first time) and is served at
https://<your-username>-<space-name>.hf.space . The Space must be public so the website can call it.
"""
import sys
from pathlib import Path

from huggingface_hub import HfApi

FILES = ["Dockerfile", ".dockerignore", "main.py", "requirements.txt"]  # nothing else (no venv, no experiments)
SPACE_README = """---
title: Kanji Interpreter API
emoji: 📷
colorFrom: pink
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

Backend for the Kanji Interpreter app: `POST /analyze` with a photo (multipart field `file`) returns the kanji
words found, with readings, romaji, meanings and JLPT level. Free and local: meikiocr (OCR), SudachiPy,
pykakasi and JMdict/KANJIDIC2 via jamdict. Source: https://github.com/Sprowsbean/Kanji_Intepreter
"""

name = sys.argv[1] if len(sys.argv) > 1 else "kanji-interpreter"
api = HfApi()
user = api.whoami()["name"]
repo_id = f"{user}/{name}"
api.create_repo(repo_id, repo_type="space", space_sdk="docker", private=False, exist_ok=True)
here = Path(__file__).parent
for f in FILES:
    api.upload_file(path_or_fileobj=here / f, path_in_repo=f, repo_id=repo_id, repo_type="space")
api.upload_file(path_or_fileobj=SPACE_README.encode(), path_in_repo="README.md", repo_id=repo_id, repo_type="space")
host = repo_id.replace("/", "-").replace("_", "-").lower()
print(f"Uploaded. Build log: https://huggingface.co/spaces/{repo_id}")
print(f"API URL (set as VITE_API_URL on Render): https://{host}.hf.space")
