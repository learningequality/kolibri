/**
 * IndexedDB shim for sandbox environment.
 * Namespaces IndexedDB database names to isolate content storage.
 */
import SandboxShim from './SandboxShim';

export default class IndexedDBShim extends SandboxShim {
  static shimName = 'indexedDB';

  initialize(contentWindow, { contentNamespace }) {
    const nameSpacePrefix = `${contentNamespace}-`;
    const originalIndexDB = contentWindow.indexedDB;

    const Shim = {
      open(databaseName, version) {
        return originalIndexDB.open(nameSpacePrefix + databaseName, version);
      },
      deleteDatabase(databaseName) {
        return originalIndexDB.deleteDatabase(nameSpacePrefix + databaseName);
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

    Object.defineProperty(contentWindow, 'indexedDB', {
      value: Shim,
      configurable: true,
    });
  }
}
