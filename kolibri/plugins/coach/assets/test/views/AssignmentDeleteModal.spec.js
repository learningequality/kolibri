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
    submitButton: () => wrapper.find('button[type="submit"]'),
    cancelButton: () => wrapper.find('button[type="button"]'),
    form: () => wrapper.find('form'),
  };
  return { wrapper, els };
}

describe('AssignmentDeleteModal', () => {
  it('clicking delete causes a "delete" event to be emitted', () => {
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    // Again, clicking the submit button does not propagate to form, so doing a hack
    // els.submitButton().trigger('click');
    els.form().trigger('submit');
    expect(wrapper.emitted().submit.length).toEqual(1);
  });

  it('clicking cancel causes a "cancel" event to be emitted', () => {
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    els.cancelButton().trigger('click');
    expect(wrapper.emitted().cancel.length).toEqual(1);
  });
});
