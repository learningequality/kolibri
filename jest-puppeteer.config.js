module.exports = {
  server: {
    command: 'yarn run build-and-run',
    port: 8000,
    launchTimeout: 1000000,
  },
  launch: {
    args: ['--disable-gpu', '--no-sandbox', '--single-process', '--disable-web-security'],
  },
  browserContext: 'incognito',
};
