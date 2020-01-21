import patchXMLHttpRequest from '../src/monkeyPatchXMLHttpRequest';

describe('XMLHttpRequest patching', () => {
  let xhrOpen;
  beforeEach(() => {
    class mockXHRClass {
      constructor() {
        this.readyState = 4;
        this.responseText = '<html></html>';
      }
    }
    mockXHRClass.prototype.open = jest.fn();
    mockXHRClass.prototype.send = jest.fn();
    mockXHRClass.prototype.addEventListener = jest.fn();
    window.XMLHttpRequest = mockXHRClass;
    xhrOpen = window.XMLHttpRequest.prototype.open;
    patchXMLHttpRequest();
  });
  it('should override the prototype of the XMLHttpRequest', () => {
    expect(window.XMLHttpRequest.prototype.open).not.toBe(xhrOpen);
  });
  it('should add SKIP_HASHI=true to the GET params', () => {
    const req = new XMLHttpRequest();
    req.open('GET', 'test');
    expect(xhrOpen).toHaveBeenCalledWith('GET', 'http://kolibri.time/test?SKIP_HASHI=true');
  });
});

describe('fetch patching', () => {
  let fetchOrig;
  beforeEach(() => {
    window.fetch = jest.fn();
    fetchOrig = window.fetch;
    patchXMLHttpRequest();
  });
  it('should override the fetch function', () => {
    expect(window.fetch).not.toBe(fetchOrig);
  });
  it('should add SKIP_HASHI=true to the GET params', () => {
    fetch('test');
    expect(fetchOrig).toHaveBeenCalledWith('http://kolibri.time/test?SKIP_HASHI=true');
  });
});
