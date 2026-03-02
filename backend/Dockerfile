FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=wsgi
ENV PYTHONUNBUFFERED=1

EXPOSE 5009

CMD ["flask", "--app", "wsgi", "run", "--host", "0.0.0.0", "--port", "5009"]
