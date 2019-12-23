import Vuex from 'vuex';
import { mount } from '@vue/test-utils';
import AssignmentCopyModal from '../../src/views/plan/assignments/AssignmentCopyModal';

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
    selectClassroomForm: () => wrapper.find('#select-classroom'),
    selectLearnerGroupForm: () => wrapper.find('#select-learnergroup'),
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
    expect(els.selectClassroomForm().exists()).toEqual(true);
    expect(els.selectLearnerGroupForm().exists()).toEqual(false);
  });

  it('shows one radio button for each classroom', () => {
    const { els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    const classroomRadios = els.selectClassroomForm().findAll({ name: 'KRadioButton' });
    expect(classroomRadios.length).toEqual(2);
  });

  it('first classroom radio button is the current class and has special label', () => {
    const { els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    const currentClassroomRadio = els
      .selectClassroomForm()
      .findAll({ name: 'KRadioButton' })
      .at(0);
    expect(currentClassroomRadio.props().label).toEqual('Class Two (current class)');
  });

  it('clicking continue on Select Classroom form goes to Select Learner Group form', () => {
    const groups = [{ name: 'group 1', id: 'group_1' }];
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    wrapper.vm.getLearnerGroupsForClassroom = jest.fn().mockResolvedValue(groups);
    return wrapper.vm.goToAvailableGroups().then(() => {
      expect(els.selectLearnerGroupForm().exists()).toEqual(true);
      // Explanations should reflect the selection of Class Two (current class)
      // prettier-ignore
      const explanation = wrapper.find('p').text();
      expect(explanation).toEqual(`Will be copied to 'Class Two'`);
      // Recipient selector gets all of the groups
      const RecipientSelector = els.selectLearnerGroupForm().find({ name: 'RecipientSelector' });
      expect(RecipientSelector.props().groups).toEqual(groups);
    });
  });

  it('clicking submit on Select Learner Group form causes modal to emit a "copy" event', () => {
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
      store,
    });
    wrapper.vm.getLearnerGroupsForClassroom = jest.fn().mockResolvedValue([]);
    return wrapper.vm.goToAvailableGroups().then(() => {
      els.selectLearnerGroupForm().trigger('submit');
      // By default, this will copy the Assignment to the same class, and the entire class
      expect(wrapper.emitted().submit[0]).toEqual(['class_2', ['class_2'], []]);
    });
  });

  // not tested:
  // clicking cancel
  // error handling
});
