import { shallowMount, mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';

import { ClassesPageNames } from '../../../constants';
import YourClasses from '../index';

const localVue = createLocalVue();
localVue.use(VueRouter);

const TEST_CLASSES = [
  { id: 'class-1', name: 'Class 1' },
  { id: 'class-2', name: 'Class 2' },
  { id: 'class-3', name: 'Class 3' },
  { id: 'class-4', name: 'Class 4' },
  { id: 'class-5', name: 'Class 5' },
  { id: 'class-6', name: 'Class 6' },
];

function getViewAllLink(wrapper) {
  return wrapper.find('[data-test="viewAllLink"]');
}

function getClassesLinks(wrapper) {
  return wrapper.findAll('[data-test="classLink"]');
}

function makeWrapper(propsData) {
  const router = new VueRouter({
    routes: [
      {
        name: ClassesPageNames.CLASS_ASSIGNMENTS,
        path: '/class',
      },
      {
        name: ClassesPageNames.ALL_CLASSES,
        path: '/all-classes',
      },
    ],
  });
  router.push('/');

  return mount(YourClasses, {
    propsData,
    localVue,
    router,
  });
}

describe(`YourClasses`, () => {
  it(`smoke test`, () => {
    const wrapper = shallowMount(YourClasses);
    expect(wrapper.exists()).toBe(true);
  });

  it(`'You are not enrolled in any classes' message is displayed when no classes are provided`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toContain('You are not enrolled in any classes');
  });

  describe(`when 'short' is falsy`, () => {
    it(`all classes are displayed`, () => {
      const wrapper = makeWrapper({ classes: TEST_CLASSES });
      const links = getClassesLinks(wrapper);
      expect(links.length).toBe(6);
      TEST_CLASSES.forEach((testClass, idx) => {
        expect(links.at(idx).text()).toBe(testClass.name);
      });
    });

    it(`'View all' link is not displayed`, () => {
      const wrapper = makeWrapper({ classes: TEST_CLASSES });
      expect(getViewAllLink(wrapper).exists()).toBe(false);
    });
  });

  describe(`when 'short' is truthy`, () => {
    it(`only first four classes are displayed`, () => {
      const wrapper = makeWrapper({ classes: TEST_CLASSES, short: true });
      const links = getClassesLinks(wrapper);
      expect(links.length).toBe(4);
      TEST_CLASSES.slice(0, 4).forEach((testClass, idx) => {
        expect(links.at(idx).text()).toBe(testClass.name);
      });
    });

    it(`'View all' link is not displayed when there are no more than four classes`, () => {
      const wrapper = makeWrapper({ classes: TEST_CLASSES.slice(0, 3), short: true });
      expect(getViewAllLink(wrapper).exists()).toBe(false);
    });

    it(`'View all' link is displayed when there are more than four classes`, () => {
      const wrapper = makeWrapper({ classes: TEST_CLASSES, short: true });
      expect(getViewAllLink(wrapper).exists()).toBe(true);
    });

    it(`clicking 'View all' link navigates to all classes page`, () => {
      const wrapper = makeWrapper({ classes: TEST_CLASSES, short: true });
      getViewAllLink(wrapper).trigger('click');
      expect(wrapper.vm.$route.name).toBe(ClassesPageNames.ALL_CLASSES);
    });
  });

  it(`clicking a class navigates to the class page`, () => {
    const wrapper = makeWrapper({ classes: TEST_CLASSES });
    expect(wrapper.vm.$route.path).toBe('/');
    getClassesLinks(wrapper).at(0).trigger('click');
    expect(wrapper.vm.$route.name).toBe(ClassesPageNames.CLASS_ASSIGNMENTS);
    expect(wrapper.vm.$route.params).toEqual({ classId: 'class-1' });
  });
});
