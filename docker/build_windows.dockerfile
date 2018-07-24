FROM ubuntu:bionic

# Install wine and related packages
RUN dpkg --add-architecture i386
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    sudo \
    software-properties-common

RUN echo ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true | debconf-set-selections
RUN apt-get install -y \
    ttf-mscorefonts-installer \
    wine-stable

VOLUME /kolibridist/

CMD git clone https://github.com/learningequality/kolibri-installer-windows.git && \
    cd kolibri-installer-windows/windows && \
    git checkout $KOLIBRI_WINDOWS_INSTALLER_VERSION && \
    cp /kolibridist/kolibri-$KOLIBRI_VERSION*.whl . && \
    export KOLIBRI_BUILD_VERSION=$KOLIBRI_VERSION && \
    wine inno-compiler/ISCC.exe installer-source/KolibriSetupScript.iss && \
    cp *.exe /kolibridist/
