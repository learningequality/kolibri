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
    libgtk-3-dev \
    python3 \
    && apt-get clean

RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
  python3 get-pip.py

# Ensure that python is using python3
# copying approach from official python images
ENV PATH /usr/local/bin:$PATH
RUN cd /usr/local/bin && \
  ln -s $(which python3) python

# Allows us to invalidate cache if those repos update.
# Intentionally not pinning for dev velocity.
ADD https://github.com/kollivier/python-for-android/archive/webview_plus.zip p4a.zip
ADD https://github.com/kollivier/pyeverywhere/archive/dev.zip pew.zip

# install python dependencies
RUN pip install cython virtualenv && \
  # get kevin's custom packages
  pip install -e git+https://github.com/kollivier/pyeverywhere@p4a_update#egg=pyeverywhere && \
  pip install -e git+https://github.com/kollivier/python-for-android@pew_webview#egg=python-for-android && \
  useradd -lm kivy

ENV LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8

USER kivy:kivy
WORKDIR /home/kivy

# Initializes the directory, owned by new user. Volume mounts adopt existing permissions, etc.
RUN mkdir ~/.local ~/.pyeverywhere

COPY --chown=kivy:kivy . .

ENTRYPOINT [ "make" ]

CMD [ "kolibri.apk" ]