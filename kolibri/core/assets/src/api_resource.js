const promise = require('./promise');

const Kolibri = require('kolibri');

class Request {
  constructor(request_verb, url, data, headers) {
    if (['get', 'put', 'del', 'post'].indexOf(request_verb) < 0) {
      throw 'Must be one of get, put, del, or post';
    }
    this.promise = promise[request_verb](url, data, headers);
  }
  success (callback) {
    this.promise.then((error, text, xhr) => {
      if (!error) {
        callback(text, xhr);
      }
    });
    return this;
  }
  error (callback) {
    this.promise.then((error, text, xhr) => {
      if (error) {
        callback(error, text, xhr);
      }
    });
    return this;
  }
}

class Resource {
  constructor (resource_name, headers) {
    this.collection_url = Kolibri.urls[`${resource_name}_list`]();
    this.headers = headers;
  }
  item_url (id) {
    return `{this.collection_url}/id`
  }
  get_item (id, cb) {
    const request = new Request('get', this.item_url(id), {}, this.headers).success(this.parseItem());
  }
}

module.exports = Resource;
