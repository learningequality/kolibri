FROM ubuntu:bionic

# install latest python and nodejs
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      software-properties-common \
      curl
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -

# add yarn ppa
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      gettext \
      git \
      nodejs \
      psmisc \
      python2.7 \
      python-pip \
      python-sphinx \
      yarn


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
