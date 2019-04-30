/* TODO: Get rid of this file when Firefox breaks tables properly in CSS column layout
 * Known issues: https://caniuse.com/#feat=multicolumn
 */
const DEFAULT_PADDING = 40;

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
export default class FixTableWrap {
  /**
   * @param {Document} document
   */
  constructor(document) {
    this._document = document;
    this._maxHeight = getInnerHeight(document.body, document.body.clientHeight - DEFAULT_PADDING);
  }

  /**
   * @param {Document} document
   */
  static doFix(document) {
    const tableFixer = new FixTableWrap(document);
    tableFixer.fix();
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
          this.makeScrollable(newTable, this._maxHeight);
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
   * @param {Number} maxHeight
   */
  makeScrollable(table, maxHeight) {
    table.getElementsByTagName('td').forEach(cell => {
      const diff = table.get().clientHeight - getInnerHeight(cell);
      const div = this._document.createElement('div');

      div.style.maxHeight = `${maxHeight - diff}px`;
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
      .map(tableElement => new Table(tableElement))
      .filter(table => !table.check(this._maxHeight));
  }
}

/**
 * Helper class representing an HTML Table
 */
export class Table {
  /**
   * @param {HTMLElement|Element} table
   */
  constructor(table) {
    this._table = table;
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
    // Chunk all rows into groups that will fit into a table within `maxHeight`
    const tableSets = this.getElementsByTagName('tr').reduce(
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

    // Loop through row chunks and create the replacement tables
    return tableSets.map(tableSet => {
      // Deep clone to maintain as much as possible
      const newTable = new Table(this._table.cloneNode(true));

      // Then remove all the unnecessary leftovers
      const toRemove = [
        ...newTable.getElementsByTagName('thead'),
        ...newTable.getElementsByTagName('tfoot'),
        ...newTable.getElementsByTagName('tr'),
      ];

      toRemove.filter(Boolean).forEach(el => {
        el.parentElement.removeChild(el);
      });

      const tbody = newTable.getElementsByTagName('tbody').shift();

      // Shouldn't happen :/
      if (!tbody) {
        return newTable;
      }

      tableSet.forEach(row => {
        tbody.appendChild(row);
      });

      return newTable;
    });
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
