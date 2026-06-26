FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Системные зависимости: сборка psycopg2 (gcc/libpq) и рантайм-либы для opencv,
# которым пользуется EasyOCR. Tesseract/poppler больше не нужны — OCR на EasyOCR,
# рендер PDF через PyMuPDF.
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc libpq-dev curl \
        libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/storage /app/database && chmod -R 777 /app/storage /app/database

EXPOSE 5252

CMD ["gunicorn", "-w", "4", "--threads", "4", "-b", "0.0.0.0:5252", "--timeout", "300", "app:app"]
