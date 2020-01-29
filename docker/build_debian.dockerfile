FROM ubuntu:bionic

# Fetch some additional build requirements
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      adduser \
      build-essential \
      devscripts \
      dirmngr \
      fakeroot \
      software-properties-common

# Use the published kolibri-proposed PPA
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys AD405B4A && \
    add-apt-repository -y -u -s ppa:learningequality/kolibri-proposed

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get -y build-dep kolibri

RUN adduser --system --shell /bin/bash --home "/kolibribuild" kolibribuild && \
    cd /kolibribuild && \
    apt-get update && \
    su kolibribuild -c "apt-get -y source kolibri"

# Build an unsigned package

VOLUME /kolibridist/

CMD cd /kolibribuild && \
    DEB_VERSION=`echo -n "$KOLIBRI_VERSION" | sed -s 's/^\+\.\+\.\+\([abc]\|\.dev\)/\~\0/g'` && \
    cd kolibri-source* && \
    ls /kolibridist && \
    uupdate --no-symlink -b -v "$DEB_VERSION" /kolibridist/kolibri-$KOLIBRI_VERSION.tar.gz && \
    cd "../kolibri-source-$DEB_VERSION" && \
    debuild --no-lintian -us -uc -Zgzip -z3 && \
    cd .. && \
    cp *.deb /kolibridist/
