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
    python-pip \
    unzip \
    vim \
    wget \
    xclip \
    xsel \
    zlib1g-dev \
    zlib1g:i386 \
    && apt-get clean && \
    pip install pip --upgrade && \
    pip install cython buildozer

# would be nice if we could batch this into the bash file
# Copy over files vital to build environment
# NOTE: Technically, the only file necessary here is buildozer.spec
COPY Makefile buildozer.spec ./

# Set up build environment
RUN useradd -l kivy && \
  chown -R kivy:kivy /home/kivy && \
  su kivy -c "make updatedependencies"

# Keeping these copies separate to keep cache valid as long as possible in setup
# for kolibri builds. Buildozer takes a while to rebuild itself
COPY scripts scripts/
COPY assets assets/
# Copy over kolibri-apk specific build files
COPY src  src/

# Extract .whl files and build the apk
RUN chown -R kivy:kivy /home/kivy && \
  su kivy -c "\
    make replaceloadingpage && \
    make extractkolibriwhl && \
    make generateversion && \
    make builddebugapk"
