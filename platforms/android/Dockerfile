FROM ubuntu:16.04
LABEL maintainer="Learning Equality <info@learningequality.org>"
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

# Create an unprivileged user and run as that user, to please Buildozer
RUN adduser -u 1000 kivy && \
    mkdir -p /data /home/kivy/.buildozer && \
    chown 1000 /data && \
    chown -R kivy.kivy /home/kivy/.buildozer

USER kivy

WORKDIR /home/kivy

# Copy in the files
COPY . .

# Clean apks, update packges, and remove loading page
RUN make clean
RUN make updatedependencies
RUN make removeloadingpage

# Because COPY below won't run as kivy user, make sure it will then have permission to unzip to ./src
USER root
RUN mkdir -p /home/kivy/src && \
    chown kivy.kivy /home/kivy/src
USER kivy

# Extract .whl files
RUN make extractkolibriwhl

# Generate version
RUN make generateversion

# Build the APK
RUN make builddebugapk

# Copy the generated APK up the root for easy discovery and extraction
USER root
RUN cp /home/kivy/bin/*.apk /
