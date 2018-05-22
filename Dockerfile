# First build is to just build the assets
FROM node:6.14

RUN apt-get update
# python-pip requires a compatible version of requests, so install it here too
RUN apt-get update && apt-get install -y \
    python-pip \
    python-dev \
    gettext \
    git
RUN pip install -U pip

COPY . /kolibri
WORKDIR /kolibri

RUN pip install -r requirements.txt -r requirements/build.txt
RUN yarn install
RUN make dist
RUN ls -l /kolibri/dist/

FROM python:2.7.15

COPY --from=0 /kolibri/dist/kolibri*.whl .
RUN pip install *.whl
ENTRYPOINT ["kolibri"]
CMD ["start", "--foreground"]