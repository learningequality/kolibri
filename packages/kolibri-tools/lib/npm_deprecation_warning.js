if (!process.env.npm_execpath.endsWith('yarn.js')) {
  /* eslint-disable no-console */
  console.error(
    'ERROR: Please use yarn to manage frontend dependencies, see Kolibri documentation for details'
  );
  /* eslint-enable no-console */
  process.exit(1);
}
