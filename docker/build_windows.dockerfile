FROM ubuntu:bionic

# Install wine and related packages
RUN dpkg --add-architecture i386
RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
      git-lfs \
      sudo \
      software-properties-common \
      ttf-mscorefonts-installer \
      wine-stable \
      wine32

RUN git lfs install

VOLUME /kolibridist/


# TODO(cpauya): Verify the checksums of the downloaded Python installers.

CMD git clone https://github.com/learningequality/kolibri-installer-windows.git && \
    cd kolibri-installer-windows/src && \
    git checkout $KOLIBRI_WINDOWS_INSTALLER_VERSION && \
    cp /kolibridist/kolibri-$KOLIBRI_VERSION*.whl . && \
    export KOLIBRI_BUILD_VERSION=$KOLIBRI_VERSION && \
    curl -sS https://www.python.org/ftp/python/3.4.3/python-3.4.3.msi --output "python-setup/python-3.4.3.msi" && \
    curl -sS https://www.python.org/ftp/python/3.4.3/python-3.4.3.amd64.msi --output "python-setup/python-3.4.3.amd64.msi" && \
    wine inno-compiler/ISCC.exe installer-source/KolibriSetupScript.iss && \
    mv *.exe kolibri-$KOLIBRI_VERSION-unsigned.exe && \
    cp *.exe /kolibridist/
