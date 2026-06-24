import at from 'lodash/at';
import * as csvGenerator from 'csv-generator-client';
import sanitize from '../safeFilename';

const NAME_DEFAULTS = {
  lesson: null,
  resource: null,
  group: null,
  learner: null,
};

class CSVExporter {
  /**
   * Construct a CSV exporter for a fixed set of columns.
   * @param {object[]} columns - Column descriptors, in output order.
   * @param {string} columns[].name - The title of the column.
   * @param {string} columns[].key - The key of the column (supports `dot.notation` for
   * nested fields).
   * @param {Function} [columns[].format] - A function that will produce the value for a row.
   * @param {string} [baseFilename] - Optional prefix for the generated filename.
   */
  constructor(columns, baseFilename = '') {
    this._columns = columns;
    this._filename = baseFilename;
    this._names = {
      ...NAME_DEFAULTS,
    };
  }

  /**
   * Merge `names` into the names used to build the output filename.
   * @param {object} names - Map of name parts (e.g. `{lesson, resource, group, learner}`).
   */
  addNames(names) {
    this._names = {
      ...this._names,
      ...names,
    };
  }

  /**
   * Compose the sanitised CSV filename from the configured base and name parts.
   * @returns {string} The filename, including the `.csv` extension.
   */
  buildFilename() {
    const filenameParts = [this._filename];

    if (this._names.group && !this._names.learner) {
      filenameParts.push(this._names.group);
    }

    if (this._names.lesson) {
      filenameParts.push(this._names.lesson);
    }

    if (this._names.resource) {
      filenameParts.push(this._names.resource);
    }

    if (this._names.learner) {
      filenameParts.push(this._names.learner);
    }

    // Append anything else in `_names`
    Object.entries(this._names).forEach(([key, value]) => {
      if (key in NAME_DEFAULTS) {
        return;
      }

      filenameParts.push(value);
    });

    return sanitize(filenameParts.join(' - ') + '.csv');
  }

  /**
   * Apply each column's `format` function (or extract the value at `column.key`) to
   * every row, prepending a header row of column names.
   * @param {object[]} dataArray - Rows of source data.
   * @returns {Array<Array<unknown>>} Two-dimensional array suitable for CSV generation,
   * with column names as the first row.
   */
  formatData(dataArray) {
    return [
      this._columns.map(column => column.name),
      ...dataArray.map(row => {
        return this._columns.map(column => {
          if ('format' in column) {
            return column.format(row);
          }

          // Allows for deep picking, `key.next_key.other_key`
          return at(row, column.key).shift();
        });
      }),
    ];
  }

  /**
   * Trigger a CSV download in the browser for the given rows.
   * @param {object[]} dataArray - Rows of source data, formatted using `formatData`.
   */
  export(dataArray) {
    csvGenerator.download({
      fileName: this.buildFilename(),
      dataArray: this.formatData(dataArray),
      settings: {
        separator: ',',
        addQuotes: true,
        autoDetectColumns: false,
        columnKeys: this._columns.map(col => col.key),
      },
    });
  }
}

export default CSVExporter;
