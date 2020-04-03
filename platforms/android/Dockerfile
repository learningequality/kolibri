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
    libgtk-3-dev \
    && apt-get clean


# Allows us to invalidate cache if those repos update.
# Intentionally not pinning for dev velocity.
ADD https://github.com/kollivier/python-for-android/archive/webview_plus.zip p4a.zip
ADD https://github.com/kollivier/pyeverywhere/archive/dev.zip pew.zip

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

# Initializes the directory, owned by new user. Volume mounts adopt existing permissions, etc.
RUN mkdir ~/.local ~/.pyeverywhere

COPY --chown=kivy:kivy . .

ENTRYPOINT [ "make" ]

CMD [ "kolibri.apk" ]