FROM learningequality/kolibribase

ENV KOLIBRI_RUN_MODE=build

VOLUME /kolibribuild  # for mounting the whl files into other docker containers

# copy Kolibri source code into image
COPY . /kolibri

CMD cd /kolibri \
    && make dist pex \
    && cp /kolibri/dist/* /kolibribuild/
