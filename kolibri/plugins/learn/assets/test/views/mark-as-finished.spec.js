import KModal from 'kolibri-design-system/lib/KModal';
import { mount } from '@vue/test-utils';
import MarkAsFinishedModal from '../../src/views/MarkAsFinishedModal';

jest.mock('kolibri.client');

describe('Mark as finished modal', () => {
  let wrapper;
  let markSpy;
  let mockStore;
  let testSessionId = 'test';

  beforeAll(() => {
    // Mock $store.dispatch to return a Promise
    mockStore = { dispatch: jest.fn().mockImplementation(() => Promise.resolve()) };
    markSpy = jest.spyOn(MarkAsFinishedModal.methods, 'markResourceAsCompleted');

    wrapper = mount(MarkAsFinishedModal, {
      propsData: {
        contentSessionLogId: testSessionId,
      },
      mocks: {
        // So we can test that an action of a specific kind was dispatched
        $store: mockStore,
      },
    });
    wrapper.findComponent(KModal).vm.$emit('submit');
  });

  describe('When the user confirms the modal', () => {
    it('will make a call to markResourceAsCompleted', async () => {
      expect(markSpy).toHaveBeenCalled();
    });
    it('sets the id to null which makes KModal not visible', () => {
      expect(wrapper.vm.id === null);
      expect(wrapper.findComponent(KModal).exists()).toBeFalsy();
    });
  });

  describe('markResourceAsCompleted', () => {
    it('makes a PATCH request to /api/logger/contentsessionlog', () => {
      expect(mockStore.dispatch).toHaveBeenCalledWith('saveContentSessionLog', {
        id: testSessionId,
        data: { progress: 1 },
      });
    });
  });
});
