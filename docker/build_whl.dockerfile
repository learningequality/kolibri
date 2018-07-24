FROM ubuntu:bionic

# install latest python and nodejs
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      curl \
      software-properties-common
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -

# add yarn ppa
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      gettext \
      git \
      nodejs \
      python2.7 \
      python-pip \
      python-sphinx \
      yarn
COPY . /kolibri

VOLUME /kolibridist/  # for mounting the whl files into other docker containers
# add buildkite pipeline specific installation here:
CMD cd /kolibri && pip install -r requirements/dev.txt && pip install -r requirements/build.txt && yarn install && make dist pex && cp /kolibri/dist/* /kolibridist/
