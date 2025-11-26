ARG TARGET_IMAGE=ubuntu:22.04
FROM ${TARGET_IMAGE} AS base

RUN apt-get update && apt-get install -y gpg tzdata

# set timezone to New York
RUN rm /etc/localtime && \
    ln -s /usr/share/zoneinfo/America/New_York /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

ENV TZ=America/New_York

COPY --chmod=755 test/setup_ppa.sh setup_ppa.sh
RUN ./setup_ppa.sh

# set options to skip interactive configuration
RUN echo "kolibri kolibri/init boolean false" | debconf-set-selections; \
    echo "kolibri kolibri/user string kolibri" | debconf-set-selections

RUN mkdir -p /app/kolibri-server
WORKDIR /app/kolibri-server


FROM base AS build

RUN apt-get update && apt-get install -y devscripts debhelper dpkg-dev

COPY .tarignore .tarignore
COPY debian debian
COPY Makefile Makefile
COPY README.rst README.rst
COPY dist_README dist_README
COPY hashi_uwsgi.ini hashi_uwsgi.ini
COPY kolibri_server_setup.py kolibri_server_setup.py
COPY nginx.conf nginx.conf
COPY nginx.d_README nginx.d_README
COPY scripts/copy_to_other_distributions.py copy_to_other_distributions.py
COPY uwsgi.d_README uwsgi.d_README
COPY uwsgi.ini uwsgi.ini

RUN apt update && apt install -y kolibri

RUN make error-pages && make deb


FROM base AS test

# set options to skip interactive configuration
RUN echo "kolibri-server kolibri-server/port select 8080" | debconf-set-selections; \
    echo "kolibri-server kolibri-server/zip_content_port select 8081" | debconf-set-selections

COPY --from=build /app/kolibri-server_*.deb /app/kolibri-server.deb

RUN apt update && apt install -y /app/kolibri-server.deb

