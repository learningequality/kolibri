if (process.env.npm_execpath.indexOf('npm') > -1) {
  console.error(
    'ERROR: Please use yarn to manage frontend dependencies, see Kolibri documentation for details'
  );
  process.exit(1);
}
