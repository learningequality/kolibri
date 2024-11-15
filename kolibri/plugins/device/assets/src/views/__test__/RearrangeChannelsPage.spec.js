import { shallowMount } from '@vue/test-utils';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line
import makeStore from '../../../test/utils/makeStore';
import RearrangeChannelsPage from '../RearrangeChannelsPage';

jest.mock('../../composables/useContentTasks');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useSnackbar');

RearrangeChannelsPage.methods.postNewOrder = () => Promise.resolve();
RearrangeChannelsPage.methods.fetchChannels = () => {
  return Promise.resolve([
    { id: '1', name: 'Channel 1' },
    { id: '2', name: 'Channel 2' },
  ]);
};
async function makeWrapper() {
  const store = makeStore();
  useUser.mockImplementation(() => useUserMock({ canManageContent: true }));
  const wrapper = shallowMount(RearrangeChannelsPage, {
    store,
  });
  // Have to wait to let the channels data load
  await global.flushPromises();
  return { wrapper };
}

describe('RearrangeChannelsPage', () => {
  const createSnackbar = jest.fn();
  beforeAll(() => {
    useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));
  });

  async function simulateSort(wrapper) {
    const dragContainer = wrapper.findComponent({ name: 'DragContainer' });
    dragContainer.vm.$emit('sort', {
      newArray: [wrapper.vm.channels[1], wrapper.vm.channels[0]],
    });
    expect(wrapper.vm.postNewOrder).toHaveBeenCalledWith(['2', '1']);
    await global.flushPromises();
  }

  it('loads the data on mount', async () => {
    const { wrapper } = await makeWrapper();
    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.vm.channels).toHaveLength(2);
  });

  it('handles a successful @sort event properly', async () => {
    const { wrapper } = await makeWrapper();
    wrapper.vm.postNewOrder = jest.fn().mockResolvedValue();
    wrapper.vm.$store.dispatch = jest.fn();
    await simulateSort(wrapper);
    expect(createSnackbar).toHaveBeenCalledWith('Channel order saved');
    expect(wrapper.vm.channels[0].id).toEqual('2');
    expect(wrapper.vm.channels[1].id).toEqual('1');
  });

  it('handles a failed @sort event properly', async () => {
    const { wrapper } = await makeWrapper();
    wrapper.vm.postNewOrder = jest.fn().mockRejectedValue();
    wrapper.vm.$store.dispatch = jest.fn();
    await simulateSort(wrapper);
    expect(createSnackbar).toHaveBeenCalledWith('There was a problem reordering the channels');
    // Channels array is reset after an error
    expect(wrapper.vm.channels[0].id).toEqual('1');
    expect(wrapper.vm.channels[1].id).toEqual('2');
  });

  // Will mock the handleOrderChange method to test these cases synchronousy,
  // since that method should be tested by the previous tests.
  it('handles a @moveUp event properly', async () => {
    const { wrapper } = await makeWrapper();
    const spy = (wrapper.vm.handleOrderChange = jest.fn());
    const dragSortWidget = wrapper.findAllComponents({ name: 'DragSortWidget' }).at(1);
    dragSortWidget.vm.$emit('moveUp');
    expect(spy).toHaveBeenCalledWith({
      newArray: [
        { id: '2', name: 'Channel 2' },
        { id: '1', name: 'Channel 1' },
      ],
    });
  });

  it('handles a @moveDown event properly', async () => {
    const { wrapper } = await makeWrapper();
    const spy = (wrapper.vm.handleOrderChange = jest.fn());
    const dragSortWidget = wrapper.findAllComponents({ name: 'DragSortWidget' }).at(0);
    dragSortWidget.vm.$emit('moveDown');
    expect(spy).toHaveBeenCalledWith({
      newArray: [
        { id: '2', name: 'Channel 2' },
        { id: '1', name: 'Channel 1' },
      ],
    });
  });
});
