FROM ubuntu:bionic

RUN apt-get update -y

COPY ./integration_testing ./.buildkite ./requirements /kolibri

COPY $GOOGLE_SPREADSHEET_CREDENTIALS ./kolibri/.buildkite

CMD cd /kolibri && \
    pip install -r requirements/testing_sheet.txt

VOLUME /kolibridist/

CMD export BUILDKITE_PULL_REQUEST_BASE_BRANCH=$BUILDKITE_PULL_REQUEST_BASE_BRANCH && \
    export BUILDKITE_BRANCH=$BUILDKITE_BRANCH && \
    export BUILDKITE_TAG=$BUILDKITE_TAG && \
    python ./kolibri/.buildkite/create_integration_testing_worksheet.py && \
    cp *.txt /kolibridist/
