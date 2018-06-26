FROM ubuntu:xenial

# install latest python and nodejs
RUN apt-get update && apt-get install -y \
    software-properties-common \
    curl
RUN add-apt-repository ppa:voronov84/andreyv
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -

# add yarn ppa
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update && apt-get install -y \
    python2.7 \
    python3.6 \
    python-pip \
    git \
    nodejs \
    yarn \
    gettext \
    python-sphinx \
    psmisc


# copy Kolibri source code into image
COPY . /kolibri

# TODO(replace with minimal needed for base)
# COPY requirements/dev.txt /kolibri/requirements/dev.txt
# COPY requirements/build.txt /kolibri/requirements/build.txt
# COPY requirements/test.txt /kolibri/requirements/test.txt
# COPY requirements/package.json /kolibri/requirements/package.json


# A volume used to share `pex`/`whl` files and fixtures with docker host
VOLUME /docker/mnt

# do the time-consuming base install commands
RUN cd /kolibri \
    && pip install -r requirements/dev.txt \
    && pip install -r requirements/build.txt \
    && pip install -r requirements/test.txt \
    && yarn install