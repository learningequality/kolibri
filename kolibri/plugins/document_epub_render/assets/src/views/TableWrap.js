/* TODO: Get rid of this file when Firefox breaks tables properly in CSS column layout
 * Known issues: https://caniuse.com/#feat=multicolumn
 */
const DEFAULT_PADDING = 40;
const Factory = {
  /**
   * @param {HTMLElement} el
   * @returns {Table}
   */
  buildTable(el) {
    return new Table(el);
  },

  /**
   * @param {Document} document
   * @returns {FixTableWrap}
   */
  buildFixer(document) {
    return new FixTableWrap(document);
  },
};

export default Factory;

/**
 * @param {HTMLElement} element
 * @param {Number} [defaultHeight]
 * @returns {Number}
 */
export const getInnerHeight = function(element, defaultHeight) {
  defaultHeight = defaultHeight || element.clientHeight;

  try {
    const styles = global.getComputedStyle(element);
    const height = parseInt(styles.getPropertyValue('height')) || defaultHeight;

    if (styles.getPropertyValue('box-sizing') !== 'border-box') {
      return height;
    }

    const props = ['padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width'];

    return props
      .map(prop => parseInt(styles.getPropertyValue(prop)) || 0)
      .reduce((height, style) => height - style, height);
  } catch (e) {
    return defaultHeight;
  }
};

/**
 * Splits tables in one or more pieces if the tables are overflowing in what is assumed to be a
 * CSS column layout, where they would otherwise be wrapping from column to column
 */
export class FixTableWrap {
  /**
   * @param {Document} document
   * @param {Object} [factory]
   * @param {Function} factory.buildTable
   */
  constructor(document, factory) {
    this._document = document;
    this._maxHeight = getInnerHeight(document.body, document.body.clientHeight - DEFAULT_PADDING);
    this._factory = factory || Factory;
  }

  /**
   * Fix all tables in document that do not fit within their container's height
   */
  fix() {
    this.getTablesToFix().forEach(table => {
      const container = table.get().parentElement;

      table.split(this._maxHeight).forEach(newTable => {
        container.insertBefore(newTable.get(), table.get());

        if (!newTable.check(this._maxHeight)) {
          this.makeScrollable(newTable);
        }
      });

      container.removeChild(table.get());
    });
  }

  /**
   * Makes table "scrollable" by making the cells scrollable. Since the tables are
   * split by rows, then this table has one row, so we'll scroll the cells.
   *
   * @param {Table} table
   */
  makeScrollable(table) {
    table.getElementsByTagName('td').forEach(cell => {
      const diff = table.get().clientHeight - getInnerHeight(cell);
      const div = this._document.createElement('div');

      div.style.maxHeight = `${this._maxHeight - diff}px`;
      div.style.overflowY = 'auto';

      // Move cell contents into div
      while (cell.firstChild) {
        div.append(cell.removeChild(cell.firstChild));
      }

      cell.append(div);
    });
  }

  /**
   * @returns {Table[]}
   */
  getTablesToFix() {
    return Array.from(this._document.getElementsByTagName('table'))
      .map(this._factory.buildTable)
      .filter(table => !table.check(this._maxHeight));
  }
}

/**
 * Helper class representing an HTML Table
 */
export class Table {
  /**
   * @param {HTMLElement|Element} table
   * @param {Object} [factory]
   * @param {Function} factory.buildTable
   */
  constructor(table, factory) {
    this._table = table;
    this._factory = factory || Factory;
  }

  /**
   * Checks to see if table less than container height or is wrapping
   *
   * @returns {boolean}
   */
  check(maxHeight) {
    // In Firefox, the table will not be breaking and wrapping according to the
    // writing-mode direction so `rects` will be just one rectangular area of where the
    // table is rendered, not multiple like in browsers that do break it among columns.
    return this._table.clientHeight < maxHeight || this._table.getClientRects().length > 1;
  }

  /**
   * Splits the table into multiple tables that fit within `maxHeight`
   *
   * @param {Number} maxHeight
   * @returns {Table[]}
   */
  split(maxHeight) {
    // Loop through row chunks and create the replacement tables
    return this.chunkRows(maxHeight).map(rowChunk => {
      const newTable = this.emptyClone();
      const tbody = newTable.getElementsByTagName('tbody').shift();

      // Shouldn't happen :/
      if (!tbody) {
        return newTable;
      }

      rowChunk.forEach(row => {
        tbody.appendChild(row);
      });

      return newTable;
    });
  }

  /**
   * Chunk all rows into groups that will fit into a table within `maxHeight`
   *
   * @param {Number} maxHeight
   * @returns {HTMLElement[][]}
   */
  chunkRows(maxHeight) {
    return this.getElementsByTagName('tr').reduce(
      (tableSets, row) => {
        const current = tableSets.pop();
        const currentHeight = current.reduce((h, row) => h + row.clientHeight, 0);

        if (current.length && currentHeight + row.clientHeight >= maxHeight) {
          tableSets.push(current);
          tableSets.push([row]);
          return tableSets;
        }

        current.push(row);
        tableSets.push(current);
        return tableSets;
      },
      [[]]
    );
  }

  /**
   * @returns {Table}
   */
  emptyClone() {
    // Deep clone to maintain as much as possible
    const newTable = this._factory.buildTable(this._table.cloneNode(true));

    // Then remove all the unnecessary leftovers
    const toRemove = [
      ...newTable.getElementsByTagName('thead'),
      ...newTable.getElementsByTagName('tfoot'),
      ...newTable.getElementsByTagName('tr'),
    ];

    toRemove.filter(Boolean).forEach(el => {
      el.parentElement.removeChild(el);
    });

    return newTable;
  }

  /**
   * @returns {HTMLElement}
   */
  get() {
    return this._table;
  }

  /**
   * @param {String} tagName
   * @returns {HTMLElement[]}
   */
  getElementsByTagName(tagName) {
    return Array.from(this._table.getElementsByTagName(tagName));
  }
}
