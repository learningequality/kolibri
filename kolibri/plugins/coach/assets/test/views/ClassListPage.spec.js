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
    coachNames: () => wrapper.find('td[data-test="coach-names"]').text(),
    coachNamesTooltip: () => wrapper.find('td[data-test="coach-names"]').attributes().title,
    classRows: () => wrapper.findAll('tbody tr'),
  };
  return { wrapper, els, store };
}

describe('ClassListPage', () => {
  it('shows one row for each class', () => {
    const { els, store } = makeWrapper();
    store.commit('SET_CLASS_INFO', {
      classList: [{ coaches: [], name: 'Class 1' }, { coaches: [], name: 'Class 2' }],
    });
    expect(els.classRows()).toHaveLength(2);
    // Not tested: data inside rows
  });

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
        bodyText: 'Create a class and enroll learners',
      });
      // prettier-ignore
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

  describe('shows the correct coach names message', () => {
    it('when there are no coaches', () => {
      const { els, store } = makeWrapper();
      store.commit('SET_CLASS_INFO', {
        classList: [{ coaches: [], name: 'Class 1' }],
      });
      expect(els.coachNames()).toEqual('–');
    });

    it('when there is one coach', () => {
      const { els, store } = makeWrapper();
      const coaches = [{ full_name: 'Mike Ditka' }];
      store.commit('SET_CLASS_INFO', {
        classList: [{ coaches, name: 'Class 1' }],
      });
      expect(els.coachNames()).toEqual('Mike Ditka');
    });
  });

  it('when there are two coaches', () => {
    const { els, store } = makeWrapper();
    const coaches = [{ full_name: 'Phil Jackson' }, { full_name: 'Steve Kerr' }];
    store.commit('SET_CLASS_INFO', {
      classList: [{ coaches, name: 'Class 1' }],
    });
    expect(els.coachNames()).toEqual('Phil Jackson, Steve Kerr');
  });

  it('when there are more than two coaches', () => {
    const { els, store } = makeWrapper();
    const coaches = [
      { full_name: 'Coach Carter' },
      { full_name: 'Coach K' },
      { full_name: 'Coach L' },
      { full_name: "Patches O'Houlihan" },
    ];
    store.commit('SET_CLASS_INFO', {
      classList: [{ coaches, name: 'Class 1' }],
    });
    expect(els.coachNames()).toEqual('Coach Carter, Coach K… (+2)');
    expect(els.coachNamesTooltip().split('\n')).toEqual([
      'Coach Carter',
      'Coach K',
      'Coach L',
      "Patches O'Houlihan",
    ]);
  });
});
