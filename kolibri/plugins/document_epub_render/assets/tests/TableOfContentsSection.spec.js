import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import TableOfContentsSection from '../src/views/TableOfContentsSection';

const section = {
  label: 'Top level section',
  href: 'href1',
};

const sectionWithEmptyLabel = {
  label: '  ',
  href: 'href1',
};

const sectionWithSubItems = {
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
};
function createWrapper({ section, depth, currentSection } = {}) {
  return mount(TableOfContentsSection, {
    propsData: {
      section,
      depth,
      currentSection,
    },
    store,
  });
}

describe('Table of Contents Section', () => {
  it('should mount', () => {
    const wrapper = createWrapper({
      section,
      depth: 0,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle section with no sub items', () => {
    const wrapper = createWrapper({
      section,
      depth: 0,
    });

    expect(wrapper.find('ul.toc-list').exists()).toBe(false);
  });

  it('should handle section with sub items', () => {
    const wrapper = createWrapper({
      section: sectionWithSubItems,
      depth: 0,
    });
    expect(wrapper.find('ul.toc-list').findAll({ name: 'TableOfContentsSection' }).length).toBe(2);
  });

  it('should display href if label is empty', () => {
    const wrapper = createWrapper({
      section: sectionWithEmptyLabel,
      depth: 0,
    });
    expect(wrapper.find({ name: 'KButton' }).text()).toBe(sectionWithEmptyLabel.href);
  });

  it('should not have a custom class if not top level section', () => {
    const wrapper = createWrapper({
      section,
      depth: 1,
    });
    expect(wrapper.classes()).not.toContain('toc-list-item-top-level');
  });

  it('should have a custom class if top level section', () => {
    const wrapper = createWrapper({
      section,
      depth: 0,
    });
    expect(wrapper.classes()).toContain('toc-list-item-top-level');
  });

  it('should add a custom class if a current section is provided and matches section', () => {
    const wrapper = createWrapper({
      section,
      depth: 0,
      currentSection: section,
    });
    expect(wrapper.find({ name: 'KButton' }).classes()).toContain('toc-list-item-button-current');
  });

  it('should not add a custom class if a current section is provided but does not match section', () => {
    const wrapper = createWrapper({
      section,
      depth: 0,
      currentSection: { label: 'Random section', href: 'href' },
    });
    expect(wrapper.find({ name: 'KButton' }).classes()).not.toContain(
      'toc-list-item-button-current'
    );
  });

  it('should emit an event if section is clicked', () => {
    const wrapper = createWrapper({
      section,
      depth: 0,
    });
    wrapper.find({ name: 'KButton' }).trigger('click');
    expect(wrapper.emitted().tocNavigation[0][0]).toBe(section);
  });
});
