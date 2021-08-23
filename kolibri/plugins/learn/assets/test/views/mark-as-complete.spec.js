import KModal from 'kolibri-design-system/lib/KModal';
import { mount } from '@vue/test-utils';
import { ContentSessionLogResource } from 'kolibri.resources';
import MarkAsCompleteModal from '../../src/views/MarkAsCompleteModal';

describe('Mark as complete modal', () => {
  let wrapper;
  let markSpy;
  let mockStore;
  let resourceSpy;
  let testSessionId = 'test';

  beforeAll(() => {
    // Mock $store.dispatch to return a Promise
    mockStore = { dispatch: jest.fn().mockImplementation(() => Promise.resolve()) };
    markSpy = jest.spyOn(MarkAsCompleteModal.methods, 'markResourceAsCompleted');
    resourceSpy = jest.spyOn(ContentSessionLogResource, 'saveModel');
    resourceSpy.mockImplementation(() => Promise.resolve());

    wrapper = mount(MarkAsCompleteModal, {
      propsData: {
        contentSessionLogId: testSessionId,
      },
      mocks: {
        $store: mockStore,
      },
    });
  });

  describe('When the user cancels the modal', () => {
    // This describe() should go before subsequent ones
    // to avoid needing to resourceSpy.mockReset()
    it('emits a cancel event', () => {
      wrapper.findComponent(KModal).vm.$emit('cancel');
      expect(resourceSpy).not.toHaveBeenCalled();
      expect(wrapper.emitted().cancel).toBeTruthy();
    });
  });

  describe('When the user confirms the modal', () => {
    beforeEach(() => {
      wrapper.findComponent(KModal).vm.$emit('submit');
    });
    it('will make a call to markResourceAsCompleted', () => {
      expect(markSpy).toHaveBeenCalled();
    });
    it('emits an event indicating that the resource is marked as complete', () => {
      expect(wrapper.emitted().complete).toBeTruthy();
    });
    it('dispatches an createSnackbar message', () => {
      expect(mockStore.dispatch).toHaveBeenCalledWith('createSnackbar', 'Resource completed');
    });
  });

  describe('markResourceAsCompleted', () => {
    it('makes a PATCH request to /api/logger/contentsessionlog', () => {
      wrapper.findComponent(KModal).vm.$emit('submit');
      expect(resourceSpy).toHaveBeenCalledWith({
        id: testSessionId,
        data: { progress: 1 },
        exists: true,
      });
    });
  });
});
