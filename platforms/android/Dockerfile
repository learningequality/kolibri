FROM ubuntu:bionic as build
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
    iproute2 \
    libffi-dev \
    libltdl-dev\
    libncurses5:i386 \
    libssl-dev \
    libstdc++6:i386 \
    libtool \
    locales \
    lsb-release \
    openjdk-8-jdk \
    python-dev \
    unzip \
    vim \
    wget \
    xclip \
    zip \
    xsel \
    zlib1g-dev \
    zlib1g:i386 \
    python-wxgtk3.0 \
    libgtk-3-dev \
    python3 \
    && apt-get clean

# Use java 1.8 because Ubuntu's gradle version doesn't support 1.11
ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME

RUN curl https://bootstrap.pypa.io/pip/3.6/get-pip.py -o get-pip.py && python3 get-pip.py

# Ensure that python is using python3
# copying approach from official python images
ENV PATH /usr/local/bin:$PATH
RUN cd /usr/local/bin && \
  ln -s $(which python3) python

RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen
ENV LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8

# Install Android SDK
ENV ANDROID_HOME=/opt/android
ENV ANDROIDSDK=$ANDROID_HOME/sdk
ENV ANDROIDNDK=$ANDROIDSDK/ndk-bundle
COPY Makefile /tmp/
RUN make -C /tmp setup SDK=$ANDROIDSDK && \
  rm -f /tmp/Makefile

# install python dependencies
COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt && \
  rm -f /tmp/requirements.txt

# Configure gradle for use in docker. Disable gradle's automatically
# detected rich console doesn't work in docker. Disable the gradle
# daemon since it will be stopped as soon as the container exits.
ENV GRADLE_OPTS="-Dorg.gradle.console=plain -Dorg.gradle.daemon=false"

# Create a mount point for the build cache and make it world writable so
# that the volume can be used by an unprivileged user without additional
# setup.
RUN mkdir /cache && chmod 777 /cache

CMD [ "make", "kolibri.apk" ]
