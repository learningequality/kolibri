import ConditionalPromise from '../src/conditionalPromise';

describe('ConditionalPromise', () => {
  describe('then method', () => {
    it('should execute functions in order', () => {
      const fn1 = jest.fn();
      const promise = new ConditionalPromise(resolve => {
        resolve();
      });
      return promise.then(fn1).then(() => {
        expect(fn1).toHaveBeenCalled();
      });
    });
    it('should delegate to catch', () => {
      const fn1 = jest.fn();
      const promise = new ConditionalPromise(reject => {
        reject();
      });
      return promise.then(fn1).catch(() => {
        expect(fn1).not.toHaveBeenCalled();
      });
    });
    it('should not execute if a previous only check fails', () => {
      const fn1 = jest.fn();
      const promise = new ConditionalPromise(resolve => {
        resolve();
      });
      return promise
        .only(() => false, fn1)
        .then(() => {
          expect(fn1).not.toHaveBeenCalled();
        });
    });
    it('should execute a subsequent then if a previous only check fails', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const promise = new ConditionalPromise(resolve => {
        resolve();
      });
      return promise
        .only(() => false, fn1)
        .then(fn2)
        .then(() => {
          expect(fn1).not.toHaveBeenCalled();
          expect(fn2).toHaveBeenCalled();
        });
    });
  });
});
