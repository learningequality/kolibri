FROM python:3.12-slim

# Create kolibri user and group (no home dir, /kolibri is used as KOLIBRI_HOME)
RUN groupadd --gid 1000 kolibri \
    && useradd --uid 1000 --gid kolibri --shell /bin/bash kolibri

# Create /kolibri directory with proper ownership
RUN mkdir /kolibri && chown kolibri:kolibri /kolibri

# Install Kolibri from PyPI
ARG KOLIBRI_VERSION
ARG KOLIBRI_VERSION_SPEC
RUN pip install --no-cache-dir kolibri${KOLIBRI_VERSION_SPEC}

# Copy entrypoint script with executable permissions
COPY --chmod=755 entrypoint.sh /entrypoint.sh
COPY README.md /README.md

# Expose ports
EXPOSE 8080 8081

# Set environment variables
ENV KOLIBRI_VERSION="${KOLIBRI_VERSION}"
ENV KOLIBRI_HOME=/kolibri
ENV KOLIBRI_HTTP_PORT=8080
ENV KOLIBRI_ZIP_CONTENT_PORT=8081

WORKDIR /kolibri

ENTRYPOINT ["/entrypoint.sh"]
CMD ["kolibri", "start", "--foreground"]
