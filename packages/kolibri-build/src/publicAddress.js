// Chrome maps 0.0.0.0 to loopback, Firefox does not, so a wildcard can never be advertised.
const WILDCARD_HOSTS = ['0.0.0.0', '::', '[::]'];

/**
 * Resolve the address the browser is told to use, from the dev server's CLI options.
 * @param {object} options - The dev command's options.
 * @param {string} [options.publicHost] - Advertised host, from `--public-host`.
 * @param {number} [options.publicPort] - Advertised port, from `--public-port`.
 * @param {number} options.port - Bound port, from `--port`.
 * @returns {{host: string, port: number}} The advertised host and port.
 */
function publicAddress({ publicHost, publicPort, port }) {
  const host = publicHost && !WILDCARD_HOSTS.includes(publicHost) ? publicHost : 'localhost';
  return { host, port: publicPort || port };
}

module.exports = { publicAddress };
