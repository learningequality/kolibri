import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import { navComponents, registerNavItem } from '../useNav';

jest.mock('kolibri.lib.logging');

describe('nav component', () => {
  afterEach(() => {
    // Clean up the registered navItems
    navComponents.pop();
  });
  it('should not register a navItem that has no nav navItem specific properties defined', () => {
    const navItem = {};
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(0);
  });
  it('should register a navItem that has a valid icon', () => {
    const navItem = {
      icon: 'timer',
      url: 'https://example.com',
    };
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(1);
  });
  it('should show not register a navItem that has an invalid icon', () => {
    const navItem = {
      icon: 'not an icon',
      url: 'https://example.com',
    };
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(0);
  });
  it('should not register a navItem that has a non-string icon', () => {
    const navItem = {
      url: 'https://example.com',
      icon: 0.1,
    };
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(0);
  });
  it('should register a navItem that has a valid url', () => {
    const navItem = {
      icon: 'search',
      url: 'https://example.com',
    };
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(1);
  });
  it('should not register a navItem that has no url', () => {
    const navItem = {
      icon: 'search',
    };
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(0);
  });
  it('should not register a navItem that has a non-string url', () => {
    const navItem = {
      icon: 'search',
      url: 0.1,
    };
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(0);
  });
  Object.values(UserKinds).forEach(role => {
    it(`should register a navItem that has a role of ${role}`, () => {
      const navItem = {
        icon: 'search',
        url: 'https://example.com',
        render() {
          return '';
        },
        role,
      };
      registerNavItem(navItem);
      expect(navComponents).toHaveLength(1);
    });
  });
  it('should not register a navItem that has an unrecognized role', () => {
    const navItem = {
      icon: 'search',
      url: 'https://example.com',
      role: 'bill',
    };
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(0);
  });
  Object.values(NavComponentSections).forEach(section => {
    it(`should register a navItem that has a section of ${section}`, () => {
      const navItem = {
        icon: 'search',
        url: 'https://example.com',
        render() {
          return '';
        },
        section,
      };
      registerNavItem(navItem);
      expect(navComponents).toHaveLength(1);
    });
  });
  it('should not register a navItem that has an unrecognized section', () => {
    const navItem = {
      icon: 'search',
      url: 'https://example.com',
      section: 'bill',
    };
    registerNavItem(navItem);
    expect(navComponents).toHaveLength(0);
  });
});
