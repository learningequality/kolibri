FROM learningequality/kolibribase

ENV KOLIBRI_RUN_MODE=devserver

COPY deploy/entrypoint.py /deploy/entrypoint.py

COPY . /kolibri
# This copies current source code into container, note code inside the container
# will not change if you change your working dir!
# For this you'll have to add option --volume $$PDW:/kolibri when running container.

WORKDIR /kolibri

ENTRYPOINT ["python", "/deploy/entrypoint.py"]

# Install kolibri from source
RUN cd /kolibri \
    && pip install -e .

CMD ["yarn", "run", "devserver"]
