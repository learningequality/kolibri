FROM ubuntu:xenial

# Build an unsigned package

RUN apt-get -y update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
       python3-pkg-resources

VOLUME /kolibridist/


# Install the new .deb for testing purposes
CMD DEBIAN_FRONTEND=noninteractive dpkg -i /kolibridist/*.deb && \
    su kolibri -p -c 'kolibri start ; kolibri stop'
