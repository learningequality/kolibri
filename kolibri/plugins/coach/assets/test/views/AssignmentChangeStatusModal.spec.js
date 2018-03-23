/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import { expect } from 'chai';
import sinon from 'sinon';
import { mount } from '@vue/test-utils';
import AssignmentChangeStatusModal from '../../src/views/assignments/AssignmentChangeStatusModal';

const defaultProps = {
  modalTitle: '',
  modalDescription: '',
};

// prettier-ignore
function makeWrapper(options) {
  const wrapper = mount(AssignmentChangeStatusModal, options);
  const els = {
    activeRadio: () => wrapper.findAll('input[type="radio"]').at(0),
    inactiveRadio: () => wrapper.findAll('input[type="radio"]').at(1),
    submitButton: () => wrapper.find('button[type="submit"]'),
    emitStub: () => sinon.stub(wrapper.vm, '$emit'),
    cancelButton: () => wrapper.find('button[name="cancel"]'),
    form: () => wrapper.find('form')
  }
  return { wrapper, els };
}

describe('AssignmentChangeStatusModal', () => {
  it('if status is changed from active to inactive, submitting form emits a "changestatus" event', () => {
    const { wrapper, els } = makeWrapper({
      propsData: {
        ...defaultProps,
        active: true,
      },
    });
    const emitStub = els.emitStub();
    expect(wrapper.vm.activeIsSelected).to.be.true;
    els.inactiveRadio().trigger('change');
    expect(wrapper.vm.activeIsSelected).to.be.false;
    // Clicking submit button doesn't propagate to form: may be bug with test-utils
    // els.submitButton().trigger('click');
    els.form().trigger('submit');
    sinon.assert.calledWith(emitStub, 'changeStatus', false);
  });

  it('if status is changed from inactive to active, submitting form emits a "changestatus" event', () => {
    const { wrapper, els } = makeWrapper({
      propsData: {
        ...defaultProps,
        active: false,
      },
    });
    const emitStub = els.emitStub();
    expect(wrapper.vm.activeIsSelected).to.be.false;
    els.activeRadio().trigger('change');
    expect(wrapper.vm.activeIsSelected).to.be.true;
    els.form().trigger('submit');
    sinon.assert.calledWith(emitStub, 'changeStatus', true);
  });

  it('if status has not changed, submitting form only closes modal', () => {
    const { els } = makeWrapper({
      propsData: {
        ...defaultProps,
        active: false,
      },
    });
    const emitStub = els.emitStub();
    els.form().trigger('submit');
    sinon.assert.calledWith(emitStub, 'cancel');
  });

  it('pressing "cancel" closes the modal', () => {
    const { els } = makeWrapper({
      propsData: { ...defaultProps },
    });
    const emitStub = els.emitStub();
    els.cancelButton().trigger('click');
    sinon.assert.calledWith(emitStub, 'cancel');
  });
});
