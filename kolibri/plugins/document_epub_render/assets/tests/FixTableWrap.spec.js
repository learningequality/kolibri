import * as mocked from '../src/views/TableWrap';

jest.mock('../src/views/TableWrap');
const MockFactory = mocked.default;
const MockFixTableWrap = mocked.FixTableWrap;
const MockTable = mocked.Table;
const mockGetInnerHeight = mocked.getInnerHeight;

const module = jest.requireActual('../src/views/TableWrap');
const Factory = module.default;
const FixTableWrap = module.FixTableWrap;
const Table = module.Table;
const noop = () => {};

// Fix static method
MockFixTableWrap.doFix = FixTableWrap.doFix;

describe('FixTableWrap', () => {
  beforeEach(() => {
    MockFactory.buildTable.mockClear();
    MockFixTableWrap.mockClear();
    MockTable.mockClear();
    mockGetInnerHeight.mockClear();
  });

  describe('#constructor()', () => {
    const doc = {
      body: {
        clientHeight: 41,
      },
    };

    it('should assign #_document', () => {
      const fixer = new FixTableWrap(doc);
      expect(fixer._document).toBe(doc);
    });

    it('should set #_maxHeight by calling getInnerHeight()', () => {
      const fixer = new FixTableWrap(doc);
      expect(fixer._maxHeight).toEqual(1);
    });

    it('should set #_factory as default', () => {
      const fixer = new FixTableWrap(doc);
      expect(fixer._factory).toEqual(Factory);
    });
  });

  describe('#fix()', () => {
    it('should #getTablesToFix()', () => {
      const fixer = new MockFixTableWrap();
      fixer.getTablesToFix.mockReturnValue([]);

      FixTableWrap.prototype.fix.call(fixer);
      expect(fixer.getTablesToFix).toHaveBeenCalledTimes(1);
    });

    it('should split each table', () => {
      const container = { removeChild: jest.fn(noop) };
      const tableEl = { parentElement: container };
      const table = new MockTable();
      table.get.mockReturnValue(tableEl);
      table.split.mockReturnValue([]);

      const fixer = new MockFixTableWrap();
      fixer._maxHeight = 42;
      fixer.getTablesToFix.mockReturnValue([table]);

      FixTableWrap.prototype.fix.call(fixer);
      expect(fixer.getTablesToFix).toHaveBeenCalledTimes(1);
      expect(table.get).toHaveBeenCalledTimes(2);
      expect(table.split).toHaveBeenCalledWith(fixer._maxHeight);
      expect(container.removeChild).toHaveBeenCalledWith(tableEl);
    });

    it('should split each table and insert new before old', () => {
      const newTableEl = { parentElement: 'newTableEl.parentElement' };
      const newTable = new MockTable();
      newTable.get.mockReturnValue(newTableEl);
      newTable.check.mockReturnValue(true);

      const container = { insertBefore: jest.fn(noop), removeChild: jest.fn(noop) };
      const tableEl = { parentElement: container };
      const table = new MockTable();
      table.get.mockReturnValue(tableEl);
      table.split.mockReturnValue([newTable]);

      const fixer = new MockFixTableWrap();
      fixer._maxHeight = 42;
      fixer.getTablesToFix.mockReturnValue([table]);

      FixTableWrap.prototype.fix.call(fixer);
      expect(fixer.getTablesToFix).toHaveBeenCalledTimes(1);
      expect(table.get).toHaveBeenCalledTimes(3);
      expect(table.split).toHaveBeenCalledWith(fixer._maxHeight);
      expect(container.insertBefore).toHaveBeenCalledWith(newTableEl, tableEl);
      expect(newTable.check).toHaveBeenCalledWith(fixer._maxHeight);
      expect(fixer.makeScrollable).not.toHaveBeenCalledTimes(1);
      expect(container.removeChild).toHaveBeenCalledWith(tableEl);
    });

    it('should split each table and make it scrollable', () => {
      const newTableEl = { parentElement: 'newTableEl.parentElement' };
      const newTable = new MockTable();
      newTable.get.mockReturnValue(newTableEl);
      newTable.check.mockReturnValue(false);

      const container = { insertBefore: jest.fn(noop), removeChild: jest.fn(noop) };
      const tableEl = { parentElement: container };
      const table = new MockTable();
      table.get.mockReturnValue(tableEl);
      table.split.mockReturnValue([newTable]);

      const fixer = new MockFixTableWrap();
      fixer._maxHeight = 42;
      fixer.getTablesToFix.mockReturnValue([table]);

      FixTableWrap.prototype.fix.call(fixer);
      expect(fixer.getTablesToFix).toHaveBeenCalledTimes(1);
      expect(table.get).toHaveBeenCalledTimes(3);
      expect(table.split).toHaveBeenCalledWith(fixer._maxHeight);
      expect(container.insertBefore).toHaveBeenCalledWith(newTableEl, tableEl);
      expect(newTable.check).toHaveBeenCalledWith(fixer._maxHeight);
      expect(fixer.makeScrollable).toHaveBeenCalledWith(newTable);
      expect(container.removeChild).toHaveBeenCalledWith(tableEl);
    });
  });

  describe('#makeScrollable', () => {
    it('should loop through an array of <td> cells', () => {
      const cells = [];
      const forEach = jest.spyOn(cells, 'forEach');

      const table = new MockTable();
      table.getElementsByTagName.mockReturnValue(cells);

      const fixer = new MockFixTableWrap();
      fixer._maxHeight = 42;
      fixer.getTablesToFix.mockReturnValue([table]);

      FixTableWrap.prototype.makeScrollable.call(fixer, table);
      expect(table.getElementsByTagName).toHaveBeenCalledWith('td');
      expect(forEach).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should loop through an array of <td> cells', () => {
      const cell = {
        clientHeight: 120,
        children: ['child1', 'child2', 'child3'],
        get firstChild() {
          return this.children[0];
        },
        removeChild: jest.fn(function(child) {
          const i = this.children.indexOf(child);
          return this.children.splice(i, 1).pop();
        }),
        append: jest.fn(noop),
      };

      const div = {
        style: { maxHeight: null, overflowY: null },
        append: jest.fn(noop),
      };

      const tableEl = { clientHeight: 130 };
      const table = new MockTable();
      table.getElementsByTagName.mockReturnValue([cell]);
      table.get.mockReturnValue(tableEl);

      const fixer = new MockFixTableWrap();
      fixer._maxHeight = 42;
      fixer._document = {
        createElement: jest.fn(() => div),
      };
      fixer.getTablesToFix.mockReturnValue([table]);

      FixTableWrap.prototype.makeScrollable.call(fixer, table);
      expect(table.getElementsByTagName).toHaveBeenCalledWith('td');
      expect(fixer._document.createElement).toHaveBeenCalledWith('div');
      expect(div.style.maxHeight).toEqual('32px');
      expect(div.style.overflowY).toEqual('auto');
      expect(div.append).toHaveBeenCalledWith('child1');
      expect(div.append).toHaveBeenCalledWith('child2');
      expect(div.append).toHaveBeenCalledWith('child3');
      expect(cell.removeChild).toHaveBeenCalledWith('child1');
      expect(cell.removeChild).toHaveBeenCalledWith('child2');
      expect(cell.removeChild).toHaveBeenCalledWith('child3');
      expect(cell.append).toHaveBeenCalledWith(div);
    });
  });

  describe('#getTablesToFix', () => {
    it('should find all <table>', () => {
      const tables = [];
      const fixer = new MockFixTableWrap();
      fixer._maxHeight = 42;
      fixer._document = {
        getElementsByTagName: jest.fn(() => tables),
      };
      fixer._factory = MockFactory;

      const actual = FixTableWrap.prototype.getTablesToFix.call(fixer);
      expect(fixer._document.getElementsByTagName).toHaveBeenCalledWith('table');
      expect(actual).toEqual(tables);
    });

    it('should create new Table instances for each <table>', () => {
      const tableEl = {};

      const fixer = new MockFixTableWrap();
      fixer._maxHeight = 42;
      fixer._document = {
        getElementsByTagName: jest.fn(() => [tableEl, tableEl]),
      };
      fixer._factory = MockFactory;

      MockTable.prototype.check.mockReturnValue(false);
      MockFactory.buildTable.mockImplementation(el => new MockTable(el));

      const actual = FixTableWrap.prototype.getTablesToFix.call(fixer);
      expect(fixer._document.getElementsByTagName).toHaveBeenCalledWith('table');
      expect(actual).toHaveLength(2);
      actual.forEach(value => expect(value).toEqual(expect.any(MockTable)));
    });

    it('should filter the <table> that pass .check()', () => {
      const fixer = new MockFixTableWrap();
      fixer._maxHeight = 42;
      fixer._document = {
        getElementsByTagName: jest.fn(() => [0, 1]),
      };
      fixer._factory = MockFactory;

      const mockTable1 = new MockTable();
      const mockTable2 = new MockTable();
      const mockTables = [mockTable1, mockTable2];
      MockFactory.buildTable.mockImplementation(i => mockTables[i]);

      mockTable1.check.mockReturnValue(true);
      mockTable2.check.mockReturnValue(false);

      const actual = FixTableWrap.prototype.getTablesToFix.call(fixer);
      expect(fixer._document.getElementsByTagName).toHaveBeenCalledWith('table');
      expect(mockTable1.check).toHaveBeenCalledWith(fixer._maxHeight);
      expect(mockTable2.check).toHaveBeenCalledWith(fixer._maxHeight);
      expect(actual).toHaveLength(1);
      expect(actual[0]).toEqual(mockTable2);
    });
  });
});

describe('Table', () => {
  describe('#constructor()', () => {
    const el = {};

    it('should assign #_table', () => {
      const table = new Table(el);
      expect(table._table).toBe(el);
    });

    it('should set #_factory as default', () => {
      const table = new Table(el);
      expect(table._factory).toEqual(Factory);
    });
  });

  describe('#check()', () => {
    const el = {
      clientHeight: 50,
      getClientRects: jest.fn(noop),
    };

    beforeEach(() => {
      el.getClientRects.mockClear();
    });

    it('should return true when table height is less than max-height', () => {
      const table = new Table(el);
      expect(table.check(51)).toBeTruthy();
    });

    it('should return true when table is wrapping', () => {
      el.getClientRects.mockReturnValue([1, 2]);
      const table = new Table(el);
      expect(table.check(50)).toBeTruthy();
      expect(el.getClientRects).toHaveBeenCalledTimes(1);
    });

    it('should return false when table is too tall and not wrapping', () => {
      el.getClientRects.mockReturnValue([1]);
      const table = new Table(el);
      expect(table.check(50)).toBeFalsy();
      expect(el.getClientRects).toHaveBeenCalledTimes(1);
    });
  });

  describe('#split()', () => {
    const el = {
      cloneNode: jest.fn(noop),
    };

    beforeEach(() => {
      el.cloneNode.mockClear();
    });

    it('should build tables from chunked rows', () => {
      const maxHeight = 10;
      const rowChunks = [
        // First table
        [{ clientHeight: 5 }],

        // Second
        [{ clientHeight: 5 }, { clientHeight: 4 }],
      ];

      const expected = [new MockTable(), new MockTable()];

      const tbodys = expected.map(newTable => {
        const appendChild = jest.fn(noop);
        const tbody = { appendChild };

        newTable.getElementsByTagName.mockReturnValue([tbody]);
        return tbody;
      });

      const table = new MockTable();
      table._table = el;
      table.chunkRows.mockReturnValue(rowChunks);
      table.emptyClone.mockReturnValueOnce(expected[0]);
      table.emptyClone.mockReturnValueOnce(expected[1]);

      const actual = Table.prototype.split.call(table, maxHeight);
      expect(table.chunkRows).toHaveBeenCalledWith(maxHeight);
      expect(actual).toHaveLength(2);
      expect(actual[0]).toEqual(expected[0]);
      expect(actual[1]).toEqual(expected[1]);
      expect(tbodys[0].appendChild).toHaveBeenCalledTimes(1);
      expect(tbodys[0].appendChild).toHaveBeenCalledWith(rowChunks[0][0]);
      expect(tbodys[1].appendChild).toHaveBeenCalledTimes(2);
      expect(tbodys[1].appendChild).toHaveBeenCalledWith(rowChunks[1][0]);
      expect(tbodys[1].appendChild).toHaveBeenCalledWith(rowChunks[1][1]);
    });
  });

  describe('#emptyClone()', () => {
    const el = {
      cloneNode: jest.fn(noop),
      removeChild: jest.fn(noop),
    };

    beforeEach(() => {
      el.cloneNode.mockClear();
      el.removeChild.mockClear();
    });

    it('should create a mostly empty clone', () => {
      const newTable = new MockTable();

      const thead = { parentElement: el };
      newTable.getElementsByTagName.mockReturnValueOnce([thead]);

      const tfoot = { parentElement: el };
      newTable.getElementsByTagName.mockReturnValueOnce([tfoot]);

      const tbody = { removeChild: jest.fn(noop) };
      const tr = { parentElement: tbody };
      newTable.getElementsByTagName.mockReturnValueOnce([tr, tr, tr]);

      const table = new MockTable();
      table._table = el;
      table._factory = MockFactory;
      MockFactory.buildTable.mockReturnValue(newTable);

      const actual = Table.prototype.emptyClone.call(table);
      expect(actual).toEqual(newTable);
      expect(el.cloneNode).toHaveBeenCalledWith(true);
      expect(el.removeChild).toHaveBeenCalledWith(thead);
      expect(el.removeChild).toHaveBeenCalledWith(tfoot);
      expect(tbody.removeChild).toHaveBeenCalledTimes(3);
      expect(tbody.removeChild).toHaveBeenCalledWith(tr);
    });
  });

  describe('#chunkRows()', () => {
    it('should chunk rows based on height', () => {
      const maxHeight = 10;
      const expected = [
        // First table
        [{ clientHeight: 5 }],

        // Second
        [{ clientHeight: 5 }, { clientHeight: 4 }],

        // Third
        [{ clientHeight: 6 }, { clientHeight: 2 }],

        // Fourth
        [
          { clientHeight: 2 },
          { clientHeight: 2 },
          { clientHeight: 2 },
          { clientHeight: 2 },
          { clientHeight: 1 },
        ],
      ];

      // Flatten expected into rows
      const rows = expected.reduce((arr, chunk) => arr.concat(chunk), []);
      expect(rows).toHaveLength(10);

      const table = new MockTable();
      table._factory = MockFactory;
      table.getElementsByTagName.mockReturnValue(rows);

      const actual = Table.prototype.chunkRows.call(table, maxHeight);
      expect(table.getElementsByTagName).toHaveBeenCalledWith('tr');
      expect(actual).toEqual(expected);
    });
  });

  describe('#get()', () => {
    it('should return table element', () => {
      const el = {};
      const table = new Table(el);

      expect(table.get()).toEqual(el);
    });
  });

  describe('#getElementsByTagName()', () => {
    it('should return all elements by tag name', () => {
      const expected = [1, 2, 3];
      const el = {
        getElementsByTagName: jest.fn(() => expected),
      };
      const table = new Table(el);

      expect(table.getElementsByTagName('test')).toEqual(expected);
      expect(el.getElementsByTagName).toHaveBeenCalledWith('test');
    });
  });
});
