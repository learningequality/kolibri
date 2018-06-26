FROM learningequality/kolibribase

ENV KOLIBRI_RUN_MODE=build

# for mounting into other containers to get pex and whl files
VOLUME /docker/mnt


# copy Kolibri source code into image
COPY . /kolibri

CMD cd /kolibri \
    && make dist pex \
    && cp /kolibri/dist/* /docker/mnt/
