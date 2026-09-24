import IndexedDBShim from '../src/indexedDBShim';
import { createMediator, destroyMediators } from './__fixtures__/mediators';

describe('The indexedDB shim', () => {
  let shim;
  let originalIndexedDB;
  let contentWindow;

  beforeEach(() => {
    shim = new IndexedDBShim(createMediator(window));
    originalIndexedDB = {
      open: jest.fn(),
      deleteDatabase: jest.fn(),
      databases: jest.fn(),
    };
    contentWindow = { indexedDB: originalIndexedDB };
  });
  afterEach(destroyMediators);

  describe('with a content namespace set', () => {
    beforeEach(() => {
      shim.initialize(contentWindow, { contentNamespace: 'abc123' });
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
        { name: 'other-abc123-theirs', version: 1 },
      ]);
      await expect(contentWindow.indexedDB.databases()).resolves.toEqual([
        { name: 'mine', version: 1 },
      ]);
    });
  });
});
