const logging = require('loglevel');
const rest = require('rest');
const mime = require('rest/interceptor/mime');

const Kolibri = require('kolibri');

const client = rest.wrap(mime);

class Model extends Object {
  constructor(data, { resourceName, idKey, params } = { idKey: 'id', params: {} }) {
    super(data);
    this._resourceName = resourceName;
    if (typeof this._resourceName !== 'string') {
      throw new TypeError('resourceName must be defined');
    }
    this._idKey = idKey;
    this._params = params;
  }
  fetch() {
    return new Promise((resolve, reject) => {
      client({ path: this._url(), params: this._params }).then((response) => {
        Object.assign(this, response.entity);
        resolve(this);
      }, (response) => {
        logging.error('An error occurred', response);
        reject(response);
      });
    });
  }
  _url() {
    return Kolibri.urls[`${this._resourceName}_detail`](this[this._idKey]);
  }
}

class Collection extends Array {
  constructor(data = [], resourceName) {
    data.forEach((val, ind, arr) => {
      if (!(val instanceof Model)) {
        arr[ind] = new Model(val, { resourceName }); // eslint-disable-line no-param-reassign
      }
    });
    super(...data);
    this.resourceName = resourceName;
    if (typeof this.resourceName !== 'string') {
      throw new TypeError('resourceName must be defined');
    }
    this.fetch = ({ params } = { params: {} }) => {
      const promise = new Promise((resolve, reject) => {
        client({ path: this.url(), params }).then((response) => {
          response.entity.forEach((item) => {
            this.push(new Model(item, { resourceName }));
          });
          resolve(this);
        }, (response) => {
          logging.error('An error occurred', response);
          reject(response);
        });
      });
      return promise;
    };
    this.url = () => Kolibri.urls[`${this.resourceName}_list`]();
  }
}

module.exports = {
  Model,
  Collection,
};
