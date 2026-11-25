export default function stubHttp(spyOn, respond) {
  return spyOn(window, 'XMLHttpRequest').mockImplementation(() => {
    let method;
    let url;
    return {
      status: 200,
      statusText: 'OK',
      onloadend: null,
      open(requestMethod, requestUrl) {
        method = requestMethod;
        url = requestUrl;
      },
      setRequestHeader() {},
      getAllResponseHeaders() {
        return 'content-type: application/json';
      },
      send(body) {
        this.responseText = JSON.stringify(
          respond(method, new URL(url, window.location.origin), body),
        );
        queueMicrotask(() => this.onloadend());
      },
    };
  });
}
