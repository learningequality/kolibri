import patchXMLHttpRequest from '../src/monkeyPatchXMLHttpRequest';

describe('XMLHttpRequest patching', () => {
  let mockXHR;
  let xhrOpen;
  beforeEach(() => {
    class mockXHRClass {
      constructor() {
        mockXHR = this;
        this.readyState = 4;
        this.responseText = '<html></html>';
      }
    }
    mockXHRClass.prototype.open = jest.fn();
    mockXHRClass.prototype.send = jest.fn();
    mockXHRClass.prototype.addEventListener = jest.fn();
    mockXHRClass.prototype.setRequestHeader = jest.fn();
    window.XMLHttpRequest = mockXHRClass;
    xhrOpen = window.XMLHttpRequest.prototype.open;
    patchXMLHttpRequest();
  });
  it('should override the prototype of the XMLHttpRequest', () => {
    expect(window.XMLHttpRequest.prototype.open).not.toBe(xhrOpen);
  });
  it('should call setRequestHeader on the request to set X-Requested-With to XMLHttpRequest', () => {
    const req = new XMLHttpRequest();
    req.open('GET', 'test');
    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('X-Requested-With', 'XMLHttpRequest');
  });
});
