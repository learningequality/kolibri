FROM learningequality/kolibribase

ENV KOLIBRI_RUN_MODE=devserver
ENV KOLIBRI_HTTP_PORT=8000
# yarn devserver port is hardcoded to 8000 so this var is only for info purposes

COPY docker/entrypoint.py /docker/entrypoint.py

COPY . /kolibri

WORKDIR /kolibri

ENTRYPOINT ["python", "/docker/entrypoint.py"]

# Install kolibri from source
RUN cd /kolibri \
    && pip install -e .

CMD ["yarn", "run", "devserver-hot"]
