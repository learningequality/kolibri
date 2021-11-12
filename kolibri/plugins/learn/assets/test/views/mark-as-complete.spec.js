import KModal from 'kolibri-design-system/lib/KModal';
import { mount } from '@vue/test-utils';
import MarkAsCompleteModal from '../../src/views/MarkAsCompleteModal';

describe('Mark as complete modal', () => {
  let wrapper;
  let markSpy;
  let mockStore;
  let testSessionId = 'test';

  beforeAll(() => {
    // Mock $store.dispatch to return a Promise
    mockStore = { dispatch: jest.fn().mockImplementation(() => Promise.resolve()) };
    markSpy = jest.spyOn(MarkAsCompleteModal.methods, 'markResourceAsCompleted');

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
    it('emits a cancel event', () => {
      wrapper.findComponent(KModal).vm.$emit('cancel');
      expect(mockStore.dispatch).not.toHaveBeenCalled();
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
      expect(mockStore.dispatch).toHaveBeenCalledWith('updateContentSession', { progress: 1 });
    });
    it('dispatches an createSnackbar message', () => {
      expect(mockStore.dispatch).toHaveBeenCalledWith('createSnackbar', 'Resource completed');
    });
  });
});
