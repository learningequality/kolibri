import Mediator from '../src/mediator';
import LocalStorage from '../src/localStorage';

describe('LocalStorage hashi shim', () => {
  let localStorage;
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    localStorage = new LocalStorage(mediator);
  });
  describe('__setData', () => {
    it('should set __data to the passed in data', () => {
      const testData = {
        test: 'test',
      };
      localStorage.__setData(testData);
      expect(localStorage.__data).toEqual(testData);
    });
    it('should set __data to an empty state if no data passed in', () => {
      localStorage.__setData();
      expect(localStorage.__data).toEqual({});
    });
  });
  describe('__getShimInterface methods', () => {
    let shim;
    beforeEach(() => {
      shim = localStorage.__getShimInterface();
    });
    describe('length getter', () => {
      it('should have length zero when no data is set', () => {
        expect(shim.length).toEqual(0);
      });
      it('should have length 1 when one item is present', () => {
        localStorage.__data['test'] = 'test';
        expect(shim.length).toEqual(1);
      });
      it('should have length 2 when 2 items are present', () => {
        localStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        expect(shim.length).toEqual(2);
      });
    });
    describe('key method', () => {
      it('should return the key of the passed in index', () => {
        localStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        expect(shim.key(1)).toEqual('test1');
      });
    });
    describe('getItem method', () => {
      it('should return the value of the passed in key', () => {
        localStorage.__setData({
          test: 'test1',
          test1: 'test',
        });
        expect(shim.getItem('test1')).toEqual('test');
      });
    });
    describe('setItem method', () => {
      it('should set the passed in key value on the __data object', () => {
        shim.setItem('test', 'testValue');
        expect(localStorage.__data['test']).toEqual('testValue');
      });
      it('should stringify any passed in data', () => {
        shim.setItem('test', {});
        expect(localStorage.__data['test']).toEqual(String({}));
      });
      it('should call stateUpdated', () => {
        localStorage.stateUpdated = jest.fn();
        shim.setItem('test', 'testValue');
        expect(localStorage.stateUpdated).toHaveBeenCalled();
      });
    });
    describe('removeItem method', () => {
      it('should remove the item corresponding to that key from __data', () => {
        localStorage.__setData({
          test: 'test1',
          test1: 'test',
        });
        shim.removeItem('test');
        expect(localStorage.__data['test1']).toEqual('test');
        expect(localStorage.__data['test']).toBeUndefined();
      });
      it('should call stateUpdated', () => {
        localStorage.stateUpdated = jest.fn();
        shim.removeItem('test');
        expect(localStorage.stateUpdated).toHaveBeenCalled();
      });
    });
    describe('clear method', () => {
      it('should empty the __data property of localStorage', () => {
        localStorage.__setData({
          test: 'test1',
          test1: 'test',
        });
        expect(localStorage.__data['test1']).toEqual('test');
        shim.clear();
        expect(localStorage.__data).toEqual({});
      });
      it('should call stateUpdated', () => {
        localStorage.stateUpdated = jest.fn();
        shim.clear();
        expect(localStorage.stateUpdated).toHaveBeenCalled();
      });
    });
  });
});
