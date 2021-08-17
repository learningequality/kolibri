import client from 'kolibri.client';
import { mount } from '@vue/test-utils';
import MarkAsFinishedModal from '../../src/views/MarkAsFinishedModal';

jest.mock('kolibri.client');

describe('Mark as finished modal', () => {
  let wrapper;
  let testSessionId = 'test';
  beforeAll(() => {
    wrapper = mount(MarkAsFinishedModal, { propsData: { contentSessionLogId: testSessionId } });
  });

  describe('When the user confirms the modal', () => {
    it('will make a call to markResourceAsCompleted', () => {
      const confirmButton = wrapper.find('button[type="submit"]');
      confirmButton.at(0).simulate('click');
      expect(wrapper.methods.markResourceAsCompleted).toHaveBeenCalled();
    });
  });

  describe('markResourceAsCompleted', () => {
    it('makes a PATCH request to /api/logger/contentsessionlog', () => {
      const expectation = {
        id: testSessionId,
        progress: 1,
      };
      expect(client).toHaveBeenCalledWith(expectation);
    });
  });
});
