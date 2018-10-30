if (!process.env.npm_execpath.endsWith('yarn.js')) {
  console.error(
    'ERROR: Please use yarn to manage frontend dependencies, see Kolibri documentation for details'
  );
  process.exit(1);
}
