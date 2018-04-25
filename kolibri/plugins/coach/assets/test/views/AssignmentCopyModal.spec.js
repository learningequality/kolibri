/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import sinon from 'sinon';
import { expect } from 'chai';
import { mount } from '@vue/test-utils';
import AssignmentCopyModal from '../../src/views/assignments/AssignmentCopyModal';

const defaultProps = {
  modalTitle: '',
  copyExplanation: '',
  assignmentQuestion: '',
  classId: 'class_2',
  classList: [{ id: 'class_1', name: 'Class One' }, { id: 'class_2', name: 'Class Two' }],
};

// prettier-ignore
function makeWrapper(options) {
  const wrapper = mount(AssignmentCopyModal, options)
  const els = {
    selectClassroomForm: () => wrapper.find('form#select-classroom'),
    selectLearnerGroupForm: () => wrapper.find('form#select-learnergroup'),
    submitButton: () => wrapper.find('button[type="submit"]')
  };
  return { wrapper, els }
}

describe('AssignmentCopyModal', () => {
  let store;
  beforeEach(() => {
    store = new Vuex.Store();
  });

  it('starts on the Select Classroom form', () => {
    const { els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    expect(els.selectClassroomForm().exists()).to.be.true;
    expect(els.selectLearnerGroupForm().exists()).to.be.false;
  });

  it('shows one radio button for each classroom', () => {
    const { els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    const classroomRadios = els.selectClassroomForm().findAll({ name: 'kRadioButton' });
    expect(classroomRadios.length).to.equal(2);
  });

  it('first classroom radio button is the current class and has special label', () => {
    const { els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    const currentClassroomRadio = els
      .selectClassroomForm()
      .findAll({ name: 'kRadioButton' })
      .at(0);
    expect(currentClassroomRadio.props().label).to.equal('Class Two (current class)');
  });

  it('clicking continue on Select Classroom form goes to Select Learner Group form', () => {
    const groups = [{ name: 'group 1', id: 'group_1' }];
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    sinon.stub(wrapper.vm, 'getLearnerGroupsForClassroom').returns(Promise.resolve(groups));
    return wrapper.vm.goToAvailableGroups().then(() => {
      expect(els.selectLearnerGroupForm().exists()).to.be.true;
      // Explanations should reflect the selection of Class Two (current class)
      // prettier-ignore
      const explanation = wrapper.find('p').text();
      expect(explanation).to.equal(`Will be copied to 'Class Two'`);
      // Recipient selector gets all of the groups
      const recipientSelector = els.selectLearnerGroupForm().find({ name: 'recipientSelector' });
      expect(recipientSelector.props().groups).to.deep.equal(groups);
    });
  });

  it('clicking submit on Select Learner Group form causes modal to emit a "copy" event', () => {
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    sinon.stub(wrapper.vm, 'getLearnerGroupsForClassroom').returns(Promise.resolve([]));
    return wrapper.vm.goToAvailableGroups().then(() => {
      els.selectLearnerGroupForm().trigger('submit');
      // By default, this will copy the Assignment to the same class, and the entire class
      expect(wrapper.emitted().copy[0]).to.deep.equal(['class_2', ['class_2']]);
    });
  });

  // not tested:
  // clicking cancel
  // error handling
});
