FROM ubuntu:16.04 as build
LABEL maintainer="Learning Equality <info@learningequality.org>" tag="kolibrikivy"
ENV DEBIAN_FRONTEND noninteractive

# Install the dependencies for the build system
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y \
    ant \
    autoconf \
    automake \
    build-essential \
    ccache \
    curl \
    cython \
    gcc \
    git \
    libffi-dev \
    libltdl-dev\
    libncurses5:i386 \
    libstdc++6:i386 \
    libtool \
    lsb-release \
    openjdk-8-jdk \
    python-dev \
    unzip \
    vim \
    wget \
    xclip \
    xsel \
    zlib1g-dev \
    zlib1g:i386 \
    python-wxgtk3.0 \
    && apt-get clean

# install python dependencies
RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
  python get-pip.py && \
  pip install cython virtualenv && \
  # get kevin's custom packages
  pip install -e git+https://github.com/kollivier/pyeverywhere@dev#egg=pyeverywhere && \
  pip install -e git+https://github.com/kollivier/python-for-android@webview_plus#egg=python-for-android && \
  useradd -lm kivy

USER kivy:kivy
WORKDIR /home/kivy

# Needed to setup & install necessary p4a environment
COPY --chown=kivy:kivy whitelist.txt project_info.template ./
COPY --chown=kivy:kivy scripts/create_dummy_project_info.py scripts/

# Makes a dummy project_info, pretty mutch just ot get pew init to run
# Downlads p4a and all python dependencies for packaging in android
RUN python ./scripts/create_dummy_project_info.py && pew init android

COPY --chown=kivy:kivy assets assets

# Could probably include this earlier on
COPY --chown=kivy:kivy icon.png .
COPY --chown=kivy:kivy src/main.py src/

# Extract .whl files and build the apk
CMD make Kolibri*.apk
