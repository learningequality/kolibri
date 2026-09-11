import Mediator from '../src/mediator';
import IndexedDBShim from '../src/indexedDBShim';

describe('The indexedDB shim', () => {
  let shim;
  let originalIndexedDB;
  let contentWindow;

  beforeEach(() => {
    shim = new IndexedDBShim(new Mediator(window));
    originalIndexedDB = {
      open: jest.fn(),
      deleteDatabase: jest.fn(),
      databases: jest.fn(),
    };
    contentWindow = { indexedDB: originalIndexedDB };
  });

  describe('with a content namespace set', () => {
    beforeEach(() => {
      shim.iframeInitialize(contentWindow, { contentNamespace: 'abc123' });
    });

    it('should prefix database names on open', () => {
      contentWindow.indexedDB.open('mydb', 2);
      expect(originalIndexedDB.open).toHaveBeenCalledWith('abc123-mydb', 2);
    });

    it('should prefix database names on deleteDatabase', () => {
      contentWindow.indexedDB.deleteDatabase('mydb');
      expect(originalIndexedDB.deleteDatabase).toHaveBeenCalledWith('abc123-mydb');
    });

    it('should only list this content namespace, with the prefix stripped', async () => {
      originalIndexedDB.databases.mockResolvedValue([
        { name: 'abc123-mine', version: 1 },
        { name: 'other-theirs', version: 1 },
      ]);
      await expect(contentWindow.indexedDB.databases()).resolves.toEqual([
        { name: 'mine', version: 1 },
      ]);
    });
  });

  describe('without a content namespace set', () => {
    beforeEach(() => {
      shim.iframeInitialize(contentWindow);
    });

    // A shim that refused to install would leave the content permanently
    // unshimmed, so it installs regardless and fails loudly on use rather than
    // leaking unprefixed databases between content.
    it('should still install itself on the content window', () => {
      expect(contentWindow.indexedDB).not.toBe(originalIndexedDB);
    });

    it('should throw on open rather than use an unprefixed name', () => {
      expect(() => contentWindow.indexedDB.open('mydb')).toThrow(
        'IndexedDB accessed before the content namespace was set',
      );
      expect(originalIndexedDB.open).not.toHaveBeenCalled();
    });
  });
});
