"""Hugging Face Space entry point (Gradio SDK; the free hardware is ZeroGPU).

The Space runs `python app.py`. It serves the same API as local development (POST /analyze, used by the
website) plus a small Gradio test page at / for trying a photo in the browser.
Local development still uses `uvicorn main:app --port 8000`; this file is only for the Space.

Why it starts through demo.launch() and not uvicorn: on ZeroGPU the `spaces` package reports the app's
@spaces.GPU functions to Hugging Face from inside gr.Blocks.launch(). Without that report the Space stops
with "No @spaces.GPU function detected during startup". So our /analyze route is added to a Gradio App and
handed to launch(_app=...) (a Gradio 6.31 option; sdk_version is pinned in the Space README).
"""
try:  # ZeroGPU: must be imported before anything CUDA-related; not installed locally / on CPU Spaces
    import spaces
except ImportError:
    spaces = None

import gradio as gr
from gradio.routes import App

from main import analyze, analyze_image

if spaces is not None:
    @spaces.GPU
    def _unused_gpu_stub():
        """Never called: the OCR runs on the CPU, so no GPU quota is used. ZeroGPU only needs one to exist."""


def try_photo(image):
    if image is None:
        return {"error": "Upload a photo with Japanese text"}
    return analyze_image(image[:, :, ::-1].copy())  # Gradio gives RGB, OpenCV code expects BGR


demo = gr.Interface(
    fn=try_photo,
    inputs=gr.Image(type="numpy", label="Photo with Japanese text"),
    outputs=gr.JSON(label="Result"),
    title="Kanji Interpreter API",
    description="Test page for the backend. The app itself calls POST /analyze. "
                "Source: https://github.com/Sprowsbean/Kanji_Intepreter",
)

# Registered before Gradio adds its own routes, so /analyze is matched first. Cross-site calls from the
# website are allowed by Gradio's CORS handling (on a public host it echoes the caller's Origin).
server = App()
server.add_api_route("/analyze", analyze, methods=["POST"])

if __name__ == "__main__":
    # ssr_mode=False: Spaces turn on Gradio's server-side rendering, which puts a Node (SvelteKit) proxy in
    # front that rejects every multipart POST ("Cross-site POST form submissions are forbidden", 403), i.e.
    # every photo upload to /analyze. Without it, Python answers on the Space's port directly.
    demo.launch(_app=server, ssr_mode=False)  # Spaces set GRADIO_SERVER_NAME/PORT (0.0.0.0:7860)
