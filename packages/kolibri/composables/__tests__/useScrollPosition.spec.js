import { get, set } from '@vueuse/core';
import useScrollPosition from '../useScrollPosition';

const { scrollPosition, scrollToSavedPosition, doNotSaveScrollPosition } = useScrollPosition();

describe(`useScrollPosition`, () => {
  describe(`scrollPosition computed ref getter/setter`, () => {
    it(`can set the coordinates and then return a cached position when there is a cached position`, () => {
      global.window.history.pushState({ key: 1 }, '');
      set(scrollPosition, { x: 150, y: 200 });
      expect(get(scrollPosition)).toEqual({ x: 150, y: 200 });
    });
  });
  describe('scrollToSavedPosition method', () => {
    it('calls window.scrollTo with the saved ScrollPosition', () => {
      expect(get(scrollPosition)).toEqual({ x: 150, y: 200 });
      jest.spyOn(window, 'scrollTo');
      scrollToSavedPosition();
      expect(window.scrollTo).toHaveBeenCalledWith(150, 200);
    });
  });
  describe('doNotSaveScrollPosition method', () => {
    it('when there is an existing state, it removes the cached state key', () => {
      expect(global.window.history.state.key).toEqual(1);
      doNotSaveScrollPosition();
      expect(global.window.history.state.key).toBeNull;
    });
  });
});
