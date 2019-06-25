import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import AssignmentDeleteModal from '../../src/views/plan/assignments/AssignmentDeleteModal';

const defaultProps = {
  modalTitle: '',
  modalDescription: '',
};

function makeWrapper(options) {
  const wrapper = mount(AssignmentDeleteModal, options);
  const els = {
    cancelButton: () => wrapper.find('button[type="button"]'),
    form: () => wrapper.find('form'),
  };
  return { wrapper, els };
}

describe('AssignmentDeleteModal', () => {
  it('clicking delete causes a "submit" event to be emitted', () => {
    const submitListener = jest.fn();
    const { els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
      listeners: {
        submit: submitListener,
      },
    });
    els.form().trigger('submit');
    expect(submitListener).toHaveBeenCalled();
  });

  it('clicking cancel causes a "cancel" event to be emitted', () => {
    const cancelListener = jest.fn();
    const { els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
      listeners: {
        cancel: cancelListener,
      },
    });
    els.cancelButton().trigger('click');
    expect(cancelListener).toHaveBeenCalled();
  });
});
