# Imagen base ligera con Python 3.11
FROM python:3.11-slim

# Evita archivos .pyc y fuerza salida sin buffer (mejores logs en Railway)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependencias primero para aprovechar la caché de capas
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copia el código de la aplicación (incluye app/data/catalog.json empaquetado)
COPY . .

# Railway inyecta la variable PORT; usa 8000 como valor por defecto en local
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
