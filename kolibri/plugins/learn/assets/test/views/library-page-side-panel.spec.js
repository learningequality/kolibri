import { shallowMount } from '@vue/test-utils';
import SidePanel from '../../src/views/LibraryPage/SidePanel';
import useSearch from '../../src/composables/useSearch';

jest.mock('../../src/composables/useSearch');

describe('LibraryPage / SidePanel', () => {
  describe('handleCategory method', () => {
    it('passes the first param to useSearch#setCategory', () => {
      const setCategorySpy = jest.spyOn(useSearch(), 'setCategory');
      const wrapper = shallowMount(SidePanel);
      wrapper.vm.handleCategory('category');
      expect(setCategorySpy).toBeCalledWith('category');
    });
  });
  describe('closeCategoryModal', () => {
    it('sets this.currentCategory to null', () => {
      const wrapper = shallowMount(SidePanel);
      wrapper.vm.closeCategoryModal();
      expect(wrapper.vm.currentCategory).toBeNull();
    });
  });
});
