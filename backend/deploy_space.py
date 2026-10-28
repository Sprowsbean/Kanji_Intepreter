"""Upload the backend to a Hugging Face Space (Gradio SDK: free; Docker Spaces are paid).

One-time: log in with a *write* token from https://huggingface.co/settings/tokens
    hf auth login
Then, from backend/:
    venv\\Scripts\\python deploy_space.py [space-name]        (default name: kanji-interpreter)
Creates the Space if it doesn't exist (public, CPU basic). Hugging Face installs the packages and starts
app.py (a few minutes the first time). The API is served at https://<username>-<space-name>.hf.space ;
the Space must be public so the website can call it.
"""
import re
import sys
from pathlib import Path

from huggingface_hub import HfApi, hf_hub_download

# local file -> path in the Space (nothing else: no venv, no experiments)
FILES = {"app.py": "app.py", "main.py": "main.py", "requirements-space.txt": "requirements.txt"}
ABOUT = """
Backend for the Kanji Interpreter app: `POST /analyze` with a photo (multipart field `file`) returns the kanji
words found, with readings, romaji, meanings and JLPT level. The page here is a test form for the same thing.
Free and local: meikiocr (OCR), SudachiPy, pykakasi and JMdict/KANJIDIC2 via jamdict.
Source: https://github.com/Sprowsbean/Kanji_Intepreter
"""


def front_matter(repo_id: str, api: HfApi) -> str:
    """Keep the Space's own settings (its Gradio sdk_version), make sure it runs Python 3.11."""
    meta = {"title": "Kanji Interpreter API", "emoji": "📷", "colorFrom": "pink", "colorTo": "gray",
            "sdk": "gradio", "app_file": "app.py", "pinned": "false"}
    try:
        old = Path(hf_hub_download(repo_id, "README.md", repo_type="space")).read_text(encoding="utf-8")
        m = re.match(r"---\n(.*?)\n---", old, re.S)
        for line in (m.group(1).splitlines() if m else []):
            if ":" in line:
                k, v = line.split(":", 1)
                meta.setdefault(k.strip(), v.strip())
                if k.strip() == "sdk_version":
                    meta["sdk_version"] = v.strip()
    except Exception:  # new Space without a README yet: Hugging Face picks the Gradio version
        pass
    meta["python_version"] = '"3.11"'  # the pinned packages (numpy, opencv, sudachi) need 3.11+
    return "---\n" + "\n".join(f"{k}: {v}" for k, v in meta.items()) + "\n---\n"


name = sys.argv[1] if len(sys.argv) > 1 else "kanji-interpreter"
api = HfApi()
user = api.whoami()["name"]
repo_id = f"{user}/{name}"
api.create_repo(repo_id, repo_type="space", space_sdk="gradio", private=False, exist_ok=True)
here = Path(__file__).parent
readme = front_matter(repo_id, api) + ABOUT
for local, remote in FILES.items():
    api.upload_file(path_or_fileobj=here / local, path_in_repo=remote, repo_id=repo_id, repo_type="space")
api.upload_file(path_or_fileobj=readme.encode(), path_in_repo="README.md", repo_id=repo_id, repo_type="space")
host = repo_id.replace("/", "-").replace("_", "-").replace(".", "-").lower()
print(f"Uploaded. Build log: https://huggingface.co/spaces/{repo_id}")
print(f"API URL (set as VITE_API_URL on Render): https://{host}.hf.space")
