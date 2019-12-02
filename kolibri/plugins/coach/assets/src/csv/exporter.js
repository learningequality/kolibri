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
   * @param {Object[]} columns
   * @param {String} columns[].name The title of the column
   * @param {String} columns[].key The key of the column
   * @param {Function} [columns[].format] A function that will produce the value for a row
   * @param {String} [baseFilename]
   */
  constructor(columns, baseFilename = '') {
    this._columns = columns;
    this._filename = baseFilename;
    this._names = {
      ...NAME_DEFAULTS,
    };
  }

  /**
   * @param {Object} names
   */
  addNames(names) {
    this._names = {
      ...this._names,
      ...names,
    };
  }

  /**
   * @return {String}
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
   * @param {Object[]} dataArray
   * @return {mixed[]}
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
   * @param {Object[]} dataArray
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
