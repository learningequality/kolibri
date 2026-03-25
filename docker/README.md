# Kolibri Official Container Image

The official container image for Kolibri, an offline learning platform designed for low-resource communities.

> [!NOTE]
> All examples use `docker` but should also work with `podman`

## Quick Start

```bash
docker run -d \
  -v /path/to/data:/kolibri \
  -p 8080:8080 \
  -p 8081:8081 \
  ghcr.io/learningequality/kolibri:latest
```

Then access Kolibri at `http://localhost:8080`.

## Required Volume Mount

**You must mount storage to `/kolibri`**. This can be any mount type (bind mount, named volume, etc.), and is where Kolibri stores all its data including:

- Database files
- Content cache
- Configuration files
- User data
- Node ID for Morango sync

Without a mounted `/kolibri` path, the container will refuse to start. Use a consistent mount so Kolibri data persists predictably across container updates and restarts.

### Why This Is Required

Kolibri requires persistent storage for:

1. **Database** - SQLite database with facility, user, and lesson data
2. **Content** - Downloaded educational content from channels
3. **Node ID** - Unique identifier for Morango synchronization (auto-generated on first run)

## Ports

The image exposes two ports:

| Port | Purpose |
|------|---------|
| 8080 | Main Kolibri web server |
| 8081 | Zip content server (for serving content from .zip archives) |

Both ports should be exposed when running the container. The zip content port is required for Kolibri to serve content from compressed archive files (H5P, Perseus, etc.).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KOLIBRI_HOME` | `/kolibri` | Directory for Kolibri data (must be mounted) |
| `KOLIBRI_HTTP_PORT` | `8080` | Port for the main web server |
| `KOLIBRI_ZIP_CONTENT_PORT` | `8081` | Port for zip content server |
| `MORANGO_SYSTEM_ID` | (auto-generated) | Morango system ID (auto-set from stored node ID) |
| `MORANGO_NODE_ID` | (auto-generated) | Morango node ID (auto-set from stored node ID) |

## Example Commands

### Basic Run

```bash
docker run -d \
  -v /srv/kolibri:/kolibri \
  -p 8080:8080 \
  -p 8081:8081 \
  --name kolibri \
  ghcr.io/learningequality/kolibri:latest
```

### With Specific Version

```bash
docker run -d \
  -v /srv/kolibri:/kolibri \
  -p 8080:8080 \
  -p 8081:8081 \
  ghcr.io/learningequality/kolibri:0.19.0
```

### Compose

`compose.yml`:

```yaml
services:
  kolibri:
    image: ghcr.io/learningequality/kolibri:latest
    ports:
      - "8080:8080"
      - "8081:8081"
    volumes:
      - ./kolibri-data:/kolibri
    restart: unless-stopped
```

```bash
docker compose up -d
```

### View Logs

```bash
docker logs -f kolibri
```

### Execute Commands in Running Container

```bash
docker exec -it kolibri kolibri manage --help
```

## Image Tags

- `latest` - Latest stable release
- `0.19` - Latest patch release for version 0.19.x
- `0.19.0` - Specific version

## Architecture Support

This image is built for multiple architectures:

- `linux/amd64` (x86_64)
- `linux/arm64` (ARM 64-bit)

The correct image is automatically pulled based on your system architecture.

## Security

### Rootless mode

Since Docker or Podman rootless modes already provide some protection, by mapping `root` inside the container to the user on the host, Kolibri runs as `root` in the container. This should ensure that the files written to the `KOLIBRI_HOME` mount should match the user outside the container.

### Default rooted mode

The default installation modes for Docker and Podman align user IDs for `root` with the host's `root` user. This may not be ideal, especially for files written to the `KOLIBRI_HOME` mount point. Therefore, the entrypoint for the image:

- Switches to a non-root user (`kolibri`)
- Attempts to match the `kolibri` UID with the mount point
- Runs as root initially to perform necessary setup tasks (mount validation, file ownership)
- Privileges are dropped before starting the Kolibri process using `gosu`

## Building Locally

```bash
docker build -t kolibri:local \
  --build-arg KOLIBRI_VERSION_SPEC='==0.19.0' \
  -f Dockerfile .
```

## Troubleshooting

### Container Won't Start

If you see the error `ERROR: /kolibri must be a mounted volume`, ensure you've added a volume mount.

```bash
# Wrong - no volume mount
docker run ghcr.io/learningequality/kolibri:latest

# Correct - with volume mount
docker run -v /path/to/data:/kolibri ghcr.io/learningequality/kolibri:latest
```

### Permission Issues

If you encounter permission errors, ensure the mounted directory is writable by your host user (`myuser`):

```bash
chown -R myuser:myuser /path/to/data
```

## References

- [Kolibri Documentation](https://kolibri.readthedocs.io/)
- [Kolibri GitHub Repository](https://github.com/learningequality/kolibri)
- [Issue #14443](https://github.com/learningequality/kolibri/issues/14443)
