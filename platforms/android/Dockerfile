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

COPY --chown=kivy:kivy . .

ENTRYPOINT [ "make" ]

CMD [ "kolibri.apk" ]