import { getCookie, setCookie } from '../cookieUtils';

describe('cookieUtils tests', () => {
  beforeEach(() => {
    Object.defineProperty(window.document, 'cookie', {
      writable: true,
      value: 'some_key=some_value',
    });
  });

  it('Check that a cookie can be accessed if it exists', () => {
    expect(getCookie('some_key')).toEqual('some_value');
  });
  it('Check that a cookie can be accessed if it does not exist', () => {
    expect(getCookie('some_random_key')).toBeUndefined();
  });
  it('Check that a cookie can be set', () => {
    setCookie('test_key', 'test_value', 10000);
    expect(getCookie('test_key')).toEqual('test_value');
  });
  it('Check that a cookie can expire after set expiration', () => {
    setCookie('test_key', 'test_value', 5000);
    setTimeout(() => {
      expect(getCookie('test_key')).toBeUndefined();
    }, 6000);
  });
});
