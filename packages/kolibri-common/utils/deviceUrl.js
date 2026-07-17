export const MAX_DEVICE_NAME_LABEL_LENGTH = 32;

// The bare .local hostname every Kolibri server always answers to, mirroring
// LOCAL_DOMAIN in kolibri/core/discovery/utils/network/broadcast.py.
const LOCAL_DOMAIN = 'kolibri.local';

// Compose an http:// URL for a .local host, appending the served port only when
// it is non-default. window.location.port is '' for the default 80/443, so an
// empty port yields a bare http://<host> address.
function localUrl(host, port) {
  return `http://${host}${port ? `:${port}` : ''}`;
}

// Mirror of slugify_device_name() in
// kolibri/core/discovery/utils/network/broadcast.py: lowercase, strip any
// character outside [a-z0-9-], then cap at MAX_DEVICE_NAME_LABEL_LENGTH.
// Returns '' when nothing survives (no custom .local alias is published).
export function slugifyDeviceName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, MAX_DEVICE_NAME_LABEL_LENGTH);
}

// Build the http://<slug>.local[:port] address the server publishes for a
// device name, mirroring the <slug>.local hostname from broadcast.py. Returns
// '' when the name slugifies to empty, i.e. no custom .local alias is published.
export function deviceLocalUrl(name, port) {
  const slug = slugifyDeviceName(name);
  if (!slug) {
    return '';
  }
  return localUrl(`${slug}.local`, port);
}

// Build the http://kolibri.local[:port] base address every server answers to,
// used in the fallback message when a name produces no custom alias.
export function baseDeviceUrl(port) {
  return localUrl(LOCAL_DOMAIN, port);
}
