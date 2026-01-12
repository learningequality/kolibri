/**
 * IndexedDB shim for sandbox environment.
 * Namespaces IndexedDB database names to isolate content storage.
 */
import { SandboxShim } from './SandboxShim';

export default class IndexedDBShim extends SandboxShim {
  static shimName = 'indexedDB';

  constructor(mediator) {
    super(mediator);
    this.contentNamespace = null;
  }

  /**
   * Prefix for this content's database names.
   * Resolved per access, so a missing namespace surfaces where it is used.
   * @returns {string} The namespace prefix
   */
  get __nameSpacePrefix() {
    if (!this.contentNamespace) {
      // Falling back to unprefixed names would leak databases between content.
      throw new Error('IndexedDB accessed before the content namespace was set');
    }
    return `${this.contentNamespace}-`;
  }

  iframeInitialize(contentWindow, { contentNamespace } = {}) {
    this.contentNamespace = contentNamespace ?? null;
    const originalIndexDB = contentWindow.indexedDB;
    const self = this;

    const Shim = {
      open(databaseName, version) {
        return originalIndexDB.open(self.__nameSpacePrefix + databaseName, version);
      },
      deleteDatabase(databaseName) {
        return originalIndexDB.deleteDatabase(self.__nameSpacePrefix + databaseName);
      },
      cmp(first, second) {
        return originalIndexDB.cmp(first, second);
      },
      databases() {
        const nameSpacePrefix = self.__nameSpacePrefix;
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
