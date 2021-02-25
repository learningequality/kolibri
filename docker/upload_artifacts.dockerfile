FROM python:3.5-slim-buster

COPY requirements/release_upload.txt .

RUN pip install -r release_upload.txt

COPY .buildkite/upload_artifacts.py .

ENTRYPOINT ["python", "upload_artifacts.py"]
