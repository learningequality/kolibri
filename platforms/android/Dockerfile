FROM ubuntu:16.04
MAINTAINER Learning Equality <info@learningequality.org>

ENV DEBIAN_FRONTEND noninteractive

# Install the dependencies for the build system
RUN dpkg --add-architecture i386 && \
            apt-get update && \
            apt-get install -y python-pip cython vim build-essential ccache git gcc openjdk-8-jdk \
                lsb-release unzip wget curl python-dev zlib1g-dev ant xsel xclip \ 
                zlib1g:i386 libncurses5:i386 libstdc++6:i386 autoconf automake libtool libffi-dev && \
            apt-get clean && \
            pip install pip --upgrade && \
            pip install cython buildozer

# Create an unprivileged user and run as that user, to please Buildozer
RUN adduser -u 1000 kivy && \
            mkdir -p /data /home/kivy/.buildozer && chown 1000 /data && \
            chown -R kivy.kivy /home/kivy/.buildozer
USER kivy
WORKDIR /home/kivy

# Copy in the Buildozer spec file, and update build system (download NDK/SDK, build Python, etc)
COPY buildozer.spec .
RUN buildozer android update

# Because COPY below won't run as kivy user, make sure it will then have permission to unzip to ./code
USER root
RUN mkdir -p /home/kivy/code && chown kivy.kivy /home/kivy/code
USER kivy

# Copy in the code and resources
COPY code ./code
COPY kolibri*.whl .
RUN unzip "kolibri*.whl" "kolibri/*" -d code/
COPY resources ./resources

# Remove the default loading page, so that it will be replaced with our own version
RUN rm .buildozer/android/platform/build/dists/kolibri/webview_includes/_load.html

# Build the APK
RUN buildozer android debug

# Copy the generated APK up the root for easy discovery and extraction
USER root
RUN cp /home/kivy/bin/*.apk /