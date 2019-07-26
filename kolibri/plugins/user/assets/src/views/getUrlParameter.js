// https://davidwalsh.name/query-string-javascript
export default function getUrlParameter(name) {
  name = name.replace(/[[]/, '[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
