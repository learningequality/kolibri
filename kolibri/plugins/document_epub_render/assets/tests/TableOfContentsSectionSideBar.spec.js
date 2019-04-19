import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import TableOfContentsSideBar from '../src/views/TableOfContentsSideBar';

const toc = [
  {
    label: 'Top level section',
    href: 'href1',
    subitems: [
      {
        label: 'Second level section',
        href: 'href2',
        subitems: [
          {
            label: 'Third level section',
            href: 'href3',
          },
        ],
      },
    ],
  },
];

const currentSection = {
  label: 'Third level section',
  href: 'href3',
};
function createWrapper({ toc, currentSection } = {}) {
  return mount(TableOfContentsSideBar, {
    propsData: {
      toc,
      currentSection,
    },
    store,
  });
}

describe('Table of Contents Side Bar', () => {
  it('should mount', () => {
    const wrapper = createWrapper({
      toc,
    });
    expect(wrapper.exists()).toBe(true);
  });
  it('should create a button for each section', () => {
    const wrapper = createWrapper({
      toc,
    });
    expect(wrapper.findAll({ name: 'KButton' }).length).toBe(3);
  });

  it('should create a ul for each section', () => {
    const wrapper = createWrapper({
      toc,
    });
    expect(wrapper.findAll('ul').length).toBe(3);
  });

  it('should emit an event if section is clicked', () => {
    const wrapper = createWrapper({
      toc,
    });
    const allSectionButtons = wrapper.findAll({ name: 'KButton' });
    allSectionButtons.wrappers[allSectionButtons.length - 1].trigger('click');
    expect(wrapper.emitted().tocNavigation[0][0]).toEqual({
      label: 'Third level section',
      href: 'href3',
    });
  });

  it('should add a class to current section if provided', () => {
    const wrapper = createWrapper({
      toc,
      currentSection,
    });
    const allSectionButtons = wrapper.findAll({ name: 'KButton' });
    const allSectionButtonsWithCustomClass = allSectionButtons.filter(button =>
      button.classes().includes('toc-list-item-button-current')
    );
    expect(allSectionButtonsWithCustomClass.length).toEqual(1);
  });
});
