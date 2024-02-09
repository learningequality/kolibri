FROM ubuntu:bionic

ENV NODE_VERSION=18.19.0

# install required packages
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl \
    software-properties-common \
    gettext \
    git \
    git-lfs \
    python3.6 \
    python-pip \
    python-sphinx

# Upgrade pip. Otherwise pip cannot install c extension packages that are not
# for current platform
RUN pip install -U pip

# add yarn ppa
RUN (curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -) && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

# install nodejs and yarn
RUN apt-get update && \
    curl -sSO https://deb.nodesource.com/node_18.x/pool/main/n/nodejs/nodejs_$NODE_VERSION-1nodesource1_amd64.deb && \
    dpkg -i ./nodejs_$NODE_VERSION-1nodesource1_amd64.deb && \
    rm nodejs_$NODE_VERSION-1nodesource1_amd64.deb && \
    apt-get install yarn

RUN git lfs install &&\
    mkdir kolibri &&\
    mkdir yarn_cache &&\
    mkdir cext_cache

WORKDIR /kolibri

# Python dependencies
COPY requirements/ requirements/
RUN echo '--- Installing Python dependencies' && \
    pip install -r requirements/build.txt

# Set yarn cache folder for easy binding during runtime
RUN yarn config set cache-folder /yarn_cache

# Copy all files in this directory
COPY . .

CMD echo '--- Installing JS dependencies' && \
    yarn install --pure-lockfile && \
    echo '--- Making whl' && \
    make dist && \
    echo '--- Making pex' && \
    make pex
