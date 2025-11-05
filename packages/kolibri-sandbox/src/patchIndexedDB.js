export default function (namespace, window) {
  const nameSpacePrefix = `${namespace}-`;
  const originalIndexDB = window.indexedDB;
  const Shim = {
    open(databaseName, version) {
      const namespacedDatabaseName = nameSpacePrefix + databaseName;
      return originalIndexDB.open(namespacedDatabaseName, version);
    },
    deleteDatabase(databaseName) {
      const namespacedDatabaseName = nameSpacePrefix + databaseName;
      return originalIndexDB.deleteDatabase(namespacedDatabaseName);
    },
    cmp(first, second) {
      return originalIndexDB.cmp(first, second);
    },
    databases() {
      return originalIndexDB.databases().then(databases => {
        return databases
          .filter(database => {
            return database.name.indexOf(nameSpacePrefix) === 0;
          })
          .map(database => {
            return {
              ...database,
              name: database.name.replace(nameSpacePrefix, ''),
            };
          });
      });
    },
  };
  Shim.open.bind(originalIndexDB);
  Shim.deleteDatabase.bind(originalIndexDB);
  Shim.cmp.bind(originalIndexDB);
  Shim.databases.bind(originalIndexDB);
  Object.defineProperty(window, 'indexedDB', {
    value: Shim,
    configurable: true,
  });
}
