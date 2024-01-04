# This Dockerfile serves as a base image for Kolibri installations. It installs python, required OS packages, node, npm, yarn and python dependencies.

# Declare python version argument.
ARG PYTHON_VARIANT="3.9-slim"
FROM python:${PYTHON_VARIANT}

# Declare node major version argument.
ARG NODE_MAJOR_VERSION="16"

# Install only the absolutely-required packages to run Kolibri -- Git, Git-LFS, ip, ps and Node (plus npm).
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y ca-certificates curl gnupg git git-lfs procps iproute2 \
  && mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR_VERSION.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
  && apt-get update && apt-get install -t nodistro -y nodejs

# Install yarn.
RUN npm install --global yarn

# Change working directory for the commands that follow.
WORKDIR /kolibri

# Copy python dependency files and install them.
COPY requirements/ ./requirements
COPY requirements.txt ./
RUN pip install --upgrade --root-user-action=ignore --default-timeout=150 pip \
  && pip install -r requirements.txt --upgrade --root-user-action=ignore --default-timeout=150 \
  && pip install -r requirements/dev.txt --upgrade --root-user-action=ignore --default-timeout=150 \
  && pip install -r requirements/test.txt --upgrade --root-user-action=ignore --default-timeout=150 \
  && pip install -r requirements/docs.txt --upgrade --root-user-action=ignore --default-timeout=150
