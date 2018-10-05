FROM ubuntu:16.04
LABEL maintainer="Learning Equality <info@learningequality.org>" tag="kolibrikivy"
ENV DEBIAN_FRONTEND noninteractive

WORKDIR /home/kivy

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
    && apt-get clean && \
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python get-pip.py && \
    pip install cython buildozer

RUN git clone -b dev https://github.com/kollivier/pyeverywhere
RUN git clone -b webview_fixes https://github.com/kollivier/python-for-android
RUN pip install -e ./pyeverywhere
RUN pip install -e ./python-for-android

# would be nice if we could batch this into the bash file
# Copy over files vital to build environment
# NOTE: Technically, the only file necessary here is buildozer.spec
COPY buildozer.spec ./

# Set up build environment
RUN useradd -l kivy && \
  chown kivy:kivy /home/kivy

COPY Makefile .git project_info.json whitelist.txt ./

# Keeping these copies separate to keep cache valid as long as possible in setup
# for kolibri builds. Buildozer takes a while to rebuild itself
COPY scripts scripts/
COPY assets assets/
# Copy over kolibri-apk specific build files
COPY src  src/

# Extract .whl files and build the apk
RUN chown kivy:kivy /home/kivy/src && cd /home/kivy && \
  su kivy -c "\
    make extractkolibriwhl && \
    make generateversion && \
    make builddebugapk"
