FROM ubuntu:bionic

# install latest python and nodejs
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      curl \
      software-properties-common

# Install nodejs and add 'hold' such that it doesn't get upgraded
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -

# add yarn ppa
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      gettext \
      git \
      git-lfs \
      nodejs=10.14.1-1nodesource1 \
      psmisc \
      python2.7 \
      python-pip \
      python-sphinx \
      yarn

RUN git lfs install

# copy Kolibri source code into image
COPY . /kolibri

# A volume used to share `pex`/`whl` files and fixtures with docker host
VOLUME /docker/mnt

# do the time-consuming base install commands
RUN cd /kolibri \
    && pip install -r requirements/dev.txt \
    && pip install -r requirements/build.txt \
    && pip install -r requirements/test.txt \
    && yarn install
