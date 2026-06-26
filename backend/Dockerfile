FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Системные зависимости для OCR/PDF: tesseract (+ языки) и poppler для pdf2image
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr tesseract-ocr-rus tesseract-ocr-kaz \
        poppler-utils \
        gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/storage /app/database && chmod -R 777 /app/storage /app/database

EXPOSE 5252

CMD ["gunicorn", "-w", "4", "--threads", "4", "-b", "0.0.0.0:5252", "--timeout", "300", "app:app"]
