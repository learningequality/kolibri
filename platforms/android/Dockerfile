FROM ubuntu:16.04
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
  pip install cython && \
  # get kevin's custom packages
  git clone -b dev https://github.com/kollivier/pyeverywhere && \
  git clone -b webview_fixes https://github.com/kollivier/python-for-android && \
  pip install -e ./pyeverywhere ./python-for-android && \
  useradd -lm kivy

USER kivy:kivy
WORKDIR /home/kivy

# Needed to setup & install necessary p4a environment
COPY project_info.json whitelist.txt Makefile ./

# Downlads p4a and all python dependencies for packaging in android
RUN pew init android


# Must be explicit, since * only gets files and COPY empties dirs
COPY --chown=kivy:kivy icons icons
COPY --chown=kivy:kivy scripts scripts
COPY --chown=kivy:kivy assets assets
COPY --chown=kivy:kivy src src

# Extract .whl files and build the apk
RUN make extractkolibriwhl && \
    make generateversion && \
    make builddebugapk
