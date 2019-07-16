FROM ubuntu:bionic

# Install wine and related packages
RUN dpkg --add-architecture i386
RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates \
      git \
      git-lfs \
      sudo \
      software-properties-common \
      ttf-mscorefonts-installer \
      wine-stable \
      wine32

RUN git lfs install

RUN echo ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true | debconf-set-selections
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y \
      ttf-mscorefonts-installer \
      wine-stable \
      make \
      wget

VOLUME /kolibridist/

CMD git clone https://github.com/mrpau/kolibri-installer-windows.git && \
    cd kolibri-installer-windows/ && \
    git checkout $KOLIBRI_WINDOWS_INSTALLER_VERSION && \
    cd src/ && \
    cp /kolibridist/kolibri-$KOLIBRI_VERSION*.whl . && \
    export KOLIBRI_BUILD_VERSION=$KOLIBRI_VERSION && \
    make && \
    wine inno-compiler/ISCC.exe installer-source/KolibriSetupScript.iss && \
    mv *.exe kolibri-$KOLIBRI_VERSION-unsigned.exe && \
    cp *.exe /kolibridist/
