# For a Hugging Face Space (SDK: Docker, CPU basic).
# Not built locally yet (local Docker Desktop storage was broken) - verify on first deploy.
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# HF Spaces run the container as uid 1000: install and cache models as that user,
# otherwise models downloaded at build time land in /root and can't be read at runtime.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH HF_HOME=/home/user/.cache/huggingface
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
COPY --chown=user main.py .
# Pre-download OCR models at build time so cold starts are fast
RUN python -c "from meikiocr import MeikiOCR; MeikiOCR()"
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
