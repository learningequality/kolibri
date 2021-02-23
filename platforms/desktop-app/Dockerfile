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
    xsel \
    zip \
    zlib1g-dev \
    zlib1g:i386 \
    python-wxgtk3.0 \
    libgtk-3-dev \
    python3 \
    && apt-get clean

# Use java 1.8 because Ubuntu's gradle version doesn't support 1.11
ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME

RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
  python3 get-pip.py

# Ensure that python is using python3
# copying approach from official python images
ENV PATH /usr/local/bin:$PATH
RUN cd /usr/local/bin && \
  ln -s $(which python3) python

ENV PEW_BRANCH=merge_updates
ENV P4A_BRANCH=pew_webview

# Allows us to invalidate cache if those repos update.
# Intentionally not pinning for dev velocity.
ADD https://github.com/kollivier/pyeverywhere/archive/$PEW_BRANCH.zip pew.zip
ADD https://github.com/kollivier/python-for-android/archive/$P4A_BRANCH.zip p4a.zip

# install python dependencies
RUN pip install cython virtualenv pbxproj && \
  # get kevin's custom packages
  pip install -e git+https://github.com/kollivier/pyeverywhere@$PEW_BRANCH#egg=pyeverywhere && \
  pip install -e git+https://github.com/kollivier/python-for-android@$P4A_BRANCH#egg=python-for-android && \
  useradd -lm kivy

RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen
ENV LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8

USER kivy:kivy
WORKDIR /home/kivy

# make sure the build is from scratch on a per-architecture basis
ARG ARCH=$ARCH

# Initializes the directory, owned by new user. Volume mounts adopt existing permissions, etc.
RUN mkdir ~/.local ~/.pyeverywhere

COPY --chown=kivy:kivy . .
ENTRYPOINT [ "make" ]

CMD [ "kolibri.apk" ]
