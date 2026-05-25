import { createLocalVue, mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import NewChannelVersionPage from '../ManageContentPage/NewChannelVersionPage';
import { makeSelectContentPageStore } from '../../__tests__/utils/makeStore';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('../ManageContentPage/api', () => ({
  fetchChannelAtSource: jest.fn().mockResolvedValue([
    { id: 'awesome_channel', name: 'Awesome Channel', version: 5 },
    { id: 'awesome_channel', name: 'Awesome Channel', version: 10, version_notes: {} },
  ]),
  fetchOrTriggerChannelDiffStatsTask: jest.fn().mockResolvedValue({
    clearable: true,
    status: 'COMPLETED',
    extra_metadata: {
      new_resources_count: 5,
      deleted_resources_count: 1,
      updated_resources_count: 2,
    },
  }),
}));
jest.mock('kolibri/apiResources/TaskResource', () => ({
  clear: jest.fn().mockResolvedValue({}),
  startTask: jest.fn().mockResolvedValue({ id: 'task-1', extra_metadata: {} }),
}));

const localVue = createLocalVue();
localVue.use(VueRouter);

function makeWrapper(routeQuery = {}) {
  const store = makeSelectContentPageStore();
  const router = new VueRouter({
    routes: [
      {
        name: 'NEW_CHANNEL_VERSION_PAGE',
        path: '/content/manage_channel/:channel_id/upgrade',
      },
      { name: 'MANAGE_CONTENT_PAGE', path: '/content' },
      { name: 'MANAGE_TASKS', path: '/content/tasks' },
    ],
  });
  router.push({
    name: 'NEW_CHANNEL_VERSION_PAGE',
    params: { channel_id: 'awesome_channel' },
    query: routeQuery,
  });
  return mount(NewChannelVersionPage, { localVue, store, router });
}

describe('NewChannelVersionPage', () => {
  it('includes token in params when token is in route query', () => {
    const wrapper = makeWrapper({ token: 'my-special-token' });
    expect(wrapper.vm.params.token).toEqual('my-special-token');
  });

  it('does not include token in params when token is absent from route query', () => {
    const wrapper = makeWrapper({});
    expect(wrapper.vm.params.token).toBeUndefined();
  });
});
