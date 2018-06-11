const http = jest.genMockFromModule('http');
const Response = require('responselike');

let responseCode = 200;
let responseEntity = {};
let responseHeaders = {};

function __setCode(code) {
  responseCode = code;
}

function __setEntity(entity) {
  responseEntity = entity;
}

function __setHeaders(headers) {
  responseHeaders = headers;
}

function request(options, callback) {
  const response = new Response(
    responseCode,
    responseHeaders,
    Buffer(JSON.stringify(responseEntity)),
    options.path
  );
  callback(response);
  const request = new http.ClientRequest();
  request.end();
  return request;
}

http.__setCode = __setCode;
http.__setEntity = __setEntity;
http.__setHeaders = __setHeaders;
http.request = request;

module.exports = http;
