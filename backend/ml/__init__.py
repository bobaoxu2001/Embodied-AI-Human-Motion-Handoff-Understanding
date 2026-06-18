"""PyTorch model stubs for the perception pipeline.

Every module here imports torch lazily/guarded so the package can be imported on
a machine without torch installed (the backend's demo mode never needs it). Each
network is a small but real architecture stub you can train and export to ONNX.
"""
