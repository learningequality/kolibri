FROM ubuntu:xenial

# Build an unsigned package

RUN apt-get -y update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        python3 build-essential \
        libssl-dev libffi-dev \
        python3-pip tzdata && dpkg-reconfigure tzdata

COPY ./integration_testing /kolibri/integration_testing
COPY ./requirements /kolibri/requirements
COPY ./.buildkite /kolibri/.buildkite

VOLUME /kolibridist/

CMD export BUILDKITE_PULL_REQUEST_BASE_BRANCH=$BUILDKITE_PULL_REQUEST_BASE_BRANCH && \
    export BUILDKITE_BRANCH=$BUILDKITE_BRANCH && \
    export BUILDKITE_TAG=$BUILDKITE_TAG && \
    pip3 install -r ./kolibri/requirements/testing_sheet.txt && \
    python3 ./kolibri/.buildkite/create_integration_testing_worksheet.py && \
    cd /kolibri/.buildkite && \
    mv *.txt /kolibridist/
