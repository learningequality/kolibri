import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import ClassListPage from '../../src/views/ClassListPage';

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(ClassListPage, {
    store,
    stubs: ['router-link'],
  });
  const els = {
    AuthMessage: () => wrapper.find({ name: 'AuthMessage' }),
  };
  return { wrapper, els, store };
}

describe('ClassListPage', () => {
  describe('it shows correct empty message', () => {
    // prettier-ignore
    function testAuthMessage(els, expectedText) {
      const headerText = els.AuthMessage().find('h1').text();
      const bodyText = els.AuthMessage().find('p').text();
      expect(headerText).toEqual(expectedText.headerText);
      expect(bodyText).toEqual(expectedText.bodyText);
    }

    it('when a class coach and no classes in facility (or no assignments)', () => {
      const { els, store } = makeWrapper();
      store.state.core.session.kind = ['classroom assignable coach'];
      testAuthMessage(els, {
        headerText: "You aren't assigned to any classes",
        bodyText: 'Please consult your Kolibri administrator to be assigned to a class',
      });
    });

    it('when an admin and no classes in facility', () => {
      const { els, store } = makeWrapper();
      store.state.core.session.kind = ['admin'];
      testAuthMessage(els, {
        headerText: 'There are no classes yet',
        bodyText: 'Create classes and enroll students in Facility',
      });
      expect(els.AuthMessage().find('a').attributes().href).toEqual('/facility');
    });

    it('when a facility coach and no classes in facility', () => {
      const { els, store } = makeWrapper();
      store.state.core.session.kind = ['coach'];
      testAuthMessage(els, {
        headerText: 'There are no classes yet',
        bodyText: 'Please consult your Kolibri administrator',
      });
    });

    it('does not show an empty message if there are classes', () => {
      const { els, store } = makeWrapper();
      store.commit('SET_CLASS_INFO', {
        classList: [{ coaches: [], name: 'Class 1' }],
      });
      expect(els.AuthMessage().exists()).toEqual(false);
    });
  });
});
