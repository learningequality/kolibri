import Mediator from '../src/mediator';
import BaseStorage from '../src/baseStorage';

describe('BaseStorage hashi shim', () => {
  let baseStorage;
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    baseStorage = new BaseStorage(mediator);
  });
  describe('__setData', () => {
    it('should set data to the passed in data', () => {
      const testData = {
        test: 'test',
      };
      baseStorage.__setData(testData);
      expect(baseStorage.data).toEqual(testData);
    });
    it('should set data to an empty state if no data passed in', () => {
      baseStorage.__setData();
      expect(baseStorage.data).toEqual({});
    });
    it('should call setDataToShim', () => {
      baseStorage.setDataToShim = jest.fn();
      baseStorage.__setData();
      expect(baseStorage.setDataToShim).toHaveBeenCalled();
    });
  });
  describe('shim management and instance methods', () => {
    let shim;
    beforeEach(() => {
      shim = baseStorage.__setShimInterface();
    });
    describe('__setShimInterface method', () => {
      it('should set baseStorage shim property', () => {
        expect(baseStorage.shim).not.toBeUndefined();
      });
    });
    describe('setDataToShim method', () => {
      it('should remove any properties from the shim that are not in the data', () => {
        shim['test1'] = 'test1';
        baseStorage.setDataToShim();
        expect(shim['test1']).toBeUndefined();
      });
      it('should add any properties to the shim that are in the data', () => {
        baseStorage.data['test'] = 'test';
        baseStorage.setDataToShim();
        expect(shim['test']).toEqual('test');
      });
      it('should not overwrite methods of the shim', () => {
        baseStorage.data['getItem'] = 'test';
        baseStorage.setDataToShim();
        expect(shim['getItem']).not.toEqual('test');
      });
    });
    describe('setDataFromShim method', () => {
      it('should remove any properties from the data that are not in the shim', () => {
        baseStorage.data['test1'] = 'test1';
        baseStorage.setDataFromShim();
        expect(baseStorage.data['test1']).toBeUndefined();
      });
      it('should add any properties to the data that are in the shim', () => {
        shim['test'] = 'test';
        baseStorage.setDataFromShim();
        expect(baseStorage.data['test']).toEqual('test');
      });
      it('should not copy methods of the shim', () => {
        shim['getItem'] = 'test';
        baseStorage.setDataFromShim();
        expect(baseStorage.data['getItem']).not.toEqual('test');
      });
    });
    describe('length getter', () => {
      it('should have length zero when no data is set', () => {
        expect(shim.length).toEqual(0);
      });
      it('should have length 1 when one item is present', () => {
        baseStorage.setData({ test: 'test' });
        expect(shim.length).toEqual(1);
      });
      it('should have length 2 when 2 items are present', () => {
        baseStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        expect(shim.length).toEqual(2);
      });
      it('should have length 1 when 2 items are set but one deleted', () => {
        baseStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        delete shim['test1'];
        expect(shim.length).toEqual(1);
      });
      it('should have length 3 when 2 items are set with __setData and another set on the shim', () => {
        baseStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        shim['test2'] = 'test';
        expect(shim.length).toEqual(3);
      });
    });
    describe('key method', () => {
      it('should return the key of the passed in index', () => {
        baseStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        expect(shim.key(1)).toEqual('test1');
      });
      it('should return the key of the passed in index', () => {
        baseStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        expect(shim.key(1)).toEqual('test1');
      });
      it('should return null if an invalid index is passed in', () => {
        baseStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        expect(shim.key(100)).toEqual(null);
      });
      it('should return null if an index that has been deleted is passed in', () => {
        baseStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        const key = shim.key(1);
        delete shim[key];
        expect(shim.key(1)).toEqual(null);
      });
      it('should return the key if an index for a key just added on the shim is passed in', () => {
        baseStorage.__setData({
          test: 'test',
          test1: 'test',
        });
        const key = 'test2';
        shim[key] = 'test';
        expect(shim.key(2)).toEqual(key);
      });
    });
    describe('getItem method', () => {
      it('should return the value of the passed in key', () => {
        baseStorage.__setData({
          test: 'test1',
          test1: 'test',
        });
        expect(shim.getItem('test1')).toEqual('test');
      });
      it('should return null for an undefined key', () => {
        expect(shim.getItem('test1')).toEqual(null);
      });
    });
    describe('setItem method', () => {
      it('should set the passed in key value on the data object', () => {
        shim.setItem('test', 'testValue');
        expect(baseStorage.data['test']).toEqual('testValue');
      });
      it('should set the passed in key value on the shim object', () => {
        shim.setItem('test', 'testValue');
        expect(shim['test']).toEqual('testValue');
      });
      it('should not set the passed in key value on the shim object if it is a shim method', () => {
        shim.setItem('getItem', 'testValue');
        expect(shim['getItem']).not.toEqual('testValue');
      });
      it('should stringify any passed in data', () => {
        shim.setItem('test', {});
        expect(baseStorage.data['test']).toEqual(String({}));
      });
      it('should call stateUpdated', () => {
        baseStorage.stateUpdated = jest.fn();
        shim.setItem('test', 'testValue');
        expect(baseStorage.stateUpdated).toHaveBeenCalled();
      });
    });
    describe('removeItem method', () => {
      it('should remove the item corresponding to that key from data', () => {
        baseStorage.__setData({
          test: 'test1',
          test1: 'test',
        });
        shim.removeItem('test');
        expect(baseStorage.data['test1']).toEqual('test');
        expect(baseStorage.data['test']).toBeUndefined();
      });
      it('should remove the item corresponding to that key from the shim', () => {
        baseStorage.__setData({
          test: 'test1',
          test1: 'test',
        });
        shim.removeItem('test');
        expect(shim['test']).toBeUndefined();
      });
      it('should not remove the item corresponding to that key from the shim if it is a shim method', () => {
        baseStorage.__setData({
          getItem: 'test',
        });
        shim.removeItem('getItem');
        expect(shim['getItem']).not.toBeUndefined();
        expect(baseStorage.data['getItem']).toBeUndefined();
      });
      it('should call stateUpdated', () => {
        baseStorage.stateUpdated = jest.fn();
        shim.removeItem('test');
        expect(baseStorage.stateUpdated).toHaveBeenCalled();
      });
    });
    describe('clear method', () => {
      it('should empty the data property of baseStorage', () => {
        baseStorage.__setData({
          test: 'test1',
          test1: 'test',
        });
        expect(baseStorage.data['test1']).toEqual('test');
        shim.clear();
        expect(baseStorage.data).toEqual({});
      });
      it('should call stateUpdated', () => {
        baseStorage.stateUpdated = jest.fn();
        shim.clear();
        expect(baseStorage.stateUpdated).toHaveBeenCalled();
      });
    });
    describe('in operator', () => {
      it('should obey the in operator for set items', () => {
        shim.setItem('test', 1);
        expect('test' in shim).toBe(true);
      });
      it('should obey the in operator for removed items', () => {
        shim.setItem('test', 1);
        shim.removeItem('test');
        expect('test' in shim).toBe(false);
      });
      it('should obey the in operator for deleted items', () => {
        shim.setItem('test', 1);
        delete shim['test'];
        expect('test' in shim).toBe(false);
      });
      it('should obey the in operator for items set before initialization', () => {
        shim = baseStorage.__setShimInterface();
      });
    });
  });
});
