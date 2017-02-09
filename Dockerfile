FROM ubuntu:xenial

# install latest python and nodejs
RUN apt-get -y update
RUN apt-get install -y software-properties-common curl
RUN add-apt-repository ppa:voronov84/andreyv
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -

# add yarn ppa
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get -y update
RUN apt-get install -y python2.7 python3.6 python-pip git nodejs yarn gettext
COPY . /kolibri

VOLUME /kolibridist/  # for mounting the whl files into other docker containers
CMD cd /kolibri && pip install -r requirements/dev.txt && pip install -r requirements/build.txt && yarn install && make dist && cp /kolibri/dist/* /kolibridist/

