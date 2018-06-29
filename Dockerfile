FROM ubuntu:xenial

# install latest python and nodejs
RUN apt-get update && apt-get install -y \
    software-properties-common \
    curl
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -

# add yarn ppa
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update && apt-get install -y \
    python2.7 \
    python-pip \
    git \
    nodejs \
    yarn \
    gettext \
    python-sphinx
COPY . /kolibri

VOLUME /kolibridist/  # for mounting the whl files into other docker containers
# add buildkite pipeline specific installation here:
CMD cd /kolibri && pip install -r requirements/dev.txt && pip install -r requirements/build.txt && pip install -e . && yarn install && make dist pex && cp /kolibri/dist/* /kolibridist/
