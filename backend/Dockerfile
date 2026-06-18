# Minimal backend image — demo mode (FastAPI only, no ML deps).
# For real inference, add a build stage that installs requirements-ml.txt and
# bakes ONNX weights into ml/weights/.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
