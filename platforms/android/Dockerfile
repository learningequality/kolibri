FROM ubuntu:16.04
MAINTAINER Learning Equality <info@learningequality.org>

ENV DEBIAN_FRONTEND noninteractive

RUN dpkg --add-architecture i386 && \
            apt-get update && \
            apt-get install -y python-pip cython vim build-essential ccache git gcc openjdk-8-jdk \
                lsb-release unzip wget curl python-dev zlib1g-dev ant xsel xclip \ 
                zlib1g:i386 libncurses5:i386 libstdc++6:i386 autoconf automake libtool && \
            apt-get clean && \
            pip install pip --upgrade && \
            pip install cython buildozer

RUN adduser -u 1000 kivy && \
            mkdir -p /data /home/kivy/.buildozer && chown 1000 /data && \
            chown -R kivy.kivy /home/kivy/.buildozer

RUN apt-get install -y libffi-dev

USER kivy

WORKDIR /home/kivy

COPY buildozer.spec .
RUN buildozer android update

COPY code ./code
COPY resources ./resources

RUN rm .buildozer/android/platform/build/dists/kolibri/webview_includes/_load.html

RUN buildozer android debug

USER root
RUN cp /home/kivy/bin/*.apk /