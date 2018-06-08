import { mount } from '@vue/test-utils';
import AssignmentDeleteModal from '../../src/views/assignments/AssignmentDeleteModal';

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
    });
    // Again, clicking the submit button does not propagate to form, so doing a hack
    // els.submitButton().trigger('click');
    els.form().trigger('submit');
    expect(wrapper.emitted().delete.length).toEqual(1);
  });

  it('clicking cancel causes a "cancel" event to be emitted', () => {
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
    });
    els.cancelButton().trigger('click');
    expect(wrapper.emitted().cancel.length).toEqual(1);
  });
});
