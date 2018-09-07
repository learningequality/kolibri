import { mount } from '@vue/test-utils';
import Epub from 'epubjs/src/epub';
import SearchSideBar from '../src/views/SearchSideBar';
import Base64EncodedEpub from './Base64EncodedEpub';

function loadBook() {
  return new Promise(resolve => {
    global.ePub = Epub;
    new Epub(Base64EncodedEpub, { encoding: 'base64' }).ready.then(book => resolve(book));
  });
}

function createWrapper({ book } = {}) {
  return mount(SearchSideBar, {
    propsData: {
      book,
    },
  });
}

describe('Search side bar', () => {
  it('should mount', () => {
    expect.assertions(1);
    loadBook().then(book => {
      const wrapper = createWrapper({ book });
      expect(wrapper.exists()).toBe(true);
    });
  });
});
