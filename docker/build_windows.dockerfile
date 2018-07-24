FROM ubuntu:xenial

# Install wine and related packages
RUN dpkg --add-architecture i386
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    sudo \
    software-properties-common

# benjaoming: Why are we using a PPA that's so clearly marked as deprecated?
# From PPA description:
# !!! PLEASE NOTE THAT THIS REPOSITORY IS DEPRECATED !!!
#
# In fact, it's double deprecated -- it was replaced by the Wine Builds PPA,
# which was then itself replaced.
RUN add-apt-repository -y -u -s ppa:ubuntu-wine/ppa && apt-get update
RUN echo ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true | debconf-set-selections
RUN apt-get install -y \
    ttf-mscorefonts-installer \
    wine1.8

VOLUME /kolibridist/

CMD git clone https://github.com/learningequality/kolibri-installer-windows.git && \
    cd kolibri-installer-windows/windows && \
    git checkout $KOLIBRI_WINDOWS_INSTALLER_VERSION && \
    cp /kolibridist/kolibri-$KOLIBRI_VERSION*.whl . && \
    export KOLIBRI_BUILD_VERSION=$KOLIBRI_VERSION && \
    wine inno-compiler/ISCC.exe installer-source/KolibriSetupScript.iss && \
    cp *.exe /kolibridist/
