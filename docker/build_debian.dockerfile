FROM ubuntu:bionic

# Fetch some additional build requirements
RUN apt-get -y update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      adduser \
      build-essential \
      devscripts \
      dirmngr \
      fakeroot \
      software-properties-common

# Use the published kolibri-proposed PPA
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys AD405B4A && \
    add-apt-repository -y -u -s ppa:learningequality/kolibri-proposed && \
    DEBIAN_FRONTEND=noninteractive apt-get -y build-dep kolibri

RUN adduser --system --shell /bin/bash --home "/kolibribuild" kolibribuild && \
    cd /kolibribuild && \
    su kolibribuild -c "apt-get -y source kolibri"

# Build an unsigned package

VOLUME /kolibridist/

CMD cd /kolibribuild && \
    DEB_VERSION=`echo -n "$KOLIBRI_VERSION" | sed -s 's/^\+\.\+\.\+\([abc]\|\.dev\)/\~\0/g'` && \
    cd kolibri-source* && \
    uupdate --no-symlink -v "$DEB_VERSION" /kolibridist/kolibri-$KOLIBRI_VERSION.tar.gz && \
    cd "../kolibri-source-$DEB_VERSION" && \
    debuild --no-lintian -us -uc && \
    cd .. && \
    cp *.deb /kolibridist/
