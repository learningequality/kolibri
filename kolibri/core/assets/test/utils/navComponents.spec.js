import navComponents from 'kolibri.utils.navComponents';
import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';

jest.mock('kolibri.lib.logging');

describe('nav component', () => {
  afterEach(() => {
    // Clean up the registered components
    navComponents.pop();
  });
  it('should register a component that has no nav component specific properties defined', () => {
    const component = {
      name: 'sideNavEntry',
      render() {
        return '';
      },
    };
    navComponents.register(component);
    expect(navComponents).toHaveLength(1);
  });
  it('should register a component that has a positive integer priority', () => {
    const component = {
      name: 'sideNavEntry',
      render() {
        return '';
      },
      priority: 10,
    };
    navComponents.register(component);
    expect(navComponents).toHaveLength(1);
  });
  it('should show not register a component that has a negative priority', () => {
    const component = {
      name: 'sideNavEntry',
      render() {
        return '';
      },
      priority: -1,
    };
    navComponents.register(component);
    expect(navComponents).toHaveLength(0);
  });
  it('should not register a component that has a non-integer priority', () => {
    const component = {
      name: 'sideNavEntry',
      render() {
        return '';
      },
      priority: 0.1,
    };
    navComponents.register(component);
    expect(navComponents).toHaveLength(0);
  });
  it('should not register a component that has a non-number priority', () => {
    const component = {
      name: 'sideNavEntry',
      render() {
        return '';
      },
      priority: 'bill',
    };
    navComponents.register(component);
    expect(navComponents).toHaveLength(0);
  });
  Object.values(UserKinds).forEach(role => {
    it(`should register a component that has a role of ${role}`, () => {
      const component = {
        name: 'sideNavEntry',
        render() {
          return '';
        },
        role,
      };
      navComponents.register(component);
      expect(navComponents).toHaveLength(1);
    });
  });
  it('should not register a component that has an unrecognized role', () => {
    const component = {
      name: 'sideNavEntry',
      render() {
        return '';
      },
      role: 'bill',
    };
    navComponents.register(component);
    expect(navComponents).toHaveLength(0);
  });
  Object.values(NavComponentSections).forEach(section => {
    it(`should register a component that has a section of ${section}`, () => {
      const component = {
        name: 'sideNavEntry',
        render() {
          return '';
        },
        section,
      };
      navComponents.register(component);
      expect(navComponents).toHaveLength(1);
    });
  });
  it('should not register a component that has an unrecognized section', () => {
    const component = {
      name: 'sideNavEntry',
      render() {
        return '';
      },
      section: 'bill',
    };
    navComponents.register(component);
    expect(navComponents).toHaveLength(0);
  });
});
