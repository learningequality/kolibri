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
RUN apt-get install -y python2.7 python3.6 python-pip git nodejs yarn gettext python-sphinx
COPY . /kolibri

RUN cd /kolibri && pip install -r requirements/dev.txt && yarn install
RUN cd /kolibri && python setup.py install

# start Kolibi on port 8009
EXPOSE 8009
CMD ["/kolibri/scripts/startkolibri.sh"]
