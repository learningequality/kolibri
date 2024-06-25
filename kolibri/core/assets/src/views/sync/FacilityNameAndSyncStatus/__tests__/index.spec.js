import { shallowMount } from '@vue/test-utils';
import FacilityNameAndSyncStatus from '../index';

describe(`FacilityNameAndSyncStatus`, () => {
  it(`smoke test`, () => {
    const wrapper = shallowMount(FacilityNameAndSyncStatus);
    expect(wrapper.exists()).toBeTruthy();
  });

  describe(`sync status`, () => {
    describe(`when a facility has never been synced`, () => {
      it(`shows the "Never synced" message`, () => {
        const wrapper = shallowMount(FacilityNameAndSyncStatus, {
          propsData: {
            facility: {
              name: 'Test facility',
              last_successful_sync: null,
              last_failed_sync: null,
            },
          },
        });
        expect(wrapper.html()).toContain('Never synced');
      });

      describe(`when the sync task has failed`, () => {
        let wrapper;
        beforeEach(() => {
          wrapper = shallowMount(FacilityNameAndSyncStatus, {
            propsData: {
              facility: {
                name: 'Test facility',
                last_successful_sync: null,
                last_failed_sync: null,
              },
              syncTaskHasFailed: true,
            },
          });
        });

        it(`doesn't show the "Never synced" message`, () => {
          expect(wrapper.html()).not.toContain('Never synced');
        });

        it(`shows the "Most recent sync failed" message`, () => {
          expect(wrapper.html()).toContain('Most recent sync failed');
        });
      });
    });

    describe(`when a facility has been synced at least once in the past`, () => {
      describe(`when the last failed sync is more recent than the last successful sync`, () => {
        let wrapper;
        beforeEach(() => {
          wrapper = shallowMount(FacilityNameAndSyncStatus, {
            propsData: {
              facility: {
                name: 'Test facility',
                last_successful_sync: '2022-04-21T16:00:00Z',
                last_failed_sync: '2022-06-25T13:00:00Z',
              },
            },
          });
        });

        it(`shows relative time of the last successful sync`, () => {
          expect(wrapper.html()).toContain(
            `Last synced: ${wrapper.vm.$formatRelative('2022-04-21T16:00:00Z', {
              now: wrapper.vm.now,
            })}`,
          );
        });

        it(`shows the "Most recent sync failed" message`, () => {
          expect(wrapper.html()).toContain('Most recent sync failed');
        });
      });

      describe(`when the last failed sync is older than the last successful sync`, () => {
        let wrapper;
        beforeEach(() => {
          wrapper = shallowMount(FacilityNameAndSyncStatus, {
            propsData: {
              facility: {
                name: 'Test facility',
                last_successful_sync: '2022-06-25T13:00:00Z',
                last_failed_sync: '2022-04-21T16:00:00Z',
              },
            },
          });
        });

        it(`shows relative time of the last successful sync`, () => {
          expect(wrapper.html()).toContain(
            `Last synced: ${wrapper.vm.$formatRelative('2022-06-25T13:00:00Z', {
              now: wrapper.vm.now,
            })}`,
          );
        });

        it(`doesn't show the "Most recent sync failed" message`, () => {
          expect(wrapper.html()).not.toContain('Most recent sync failed');
        });
      });

      describe(`when the sync task has failed`, () => {
        let wrapper;
        beforeEach(() => {
          wrapper = shallowMount(FacilityNameAndSyncStatus, {
            propsData: {
              facility: {
                name: 'Test facility',
                last_successful_sync: '2022-06-25T13:00:00Z',
                last_failed_sync: '2022-04-21T16:00:00Z',
              },
              syncTaskHasFailed: true,
            },
          });
        });

        it(`shows relative time of the last successful sync`, () => {
          expect(wrapper.html()).toContain(
            `Last synced: ${wrapper.vm.$formatRelative('2022-06-25T13:00:00Z', {
              now: wrapper.vm.now,
            })}`,
          );
        });

        // failed sync task information takes precendence over information on the facility object
        it(`shows the "Most recent sync failed" message`, () => {
          expect(wrapper.html()).toContain('Most recent sync failed');
        });
      });
    });
  });
});
