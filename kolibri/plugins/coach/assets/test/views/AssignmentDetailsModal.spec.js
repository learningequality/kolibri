import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import AssignmentDetailsModal from '../../src/views/common/assignments/AssignmentDetailsModal';

// HACK to avoid having to mock this property's dependencies on vuex and vue router
AssignmentDetailsModal.computed.titleIsInvalidText = () => '';

const defaultProps = {
  assignment: {
    title: '',
    description: '',
    assignments: [],
    learner_ids: [],
    active: false,
  },
  assignmentType: 'lesson',
  classId: 'class_1',
  groups: [],
};

function makeWrapper(options) {
  options.store = makeStore();
  const wrapper = mount(AssignmentDetailsModal, options);
  const els = {
    titleField: () => wrapper.findAllComponents({ name: 'KTextbox' }).at(0),
    descriptionField: () => wrapper.findAllComponents({ name: 'KTextbox' }).at(1),
    form: () => wrapper.find('form'),
  };
  const actions = {
    inputTitle: text => els.titleField().vm.$emit('input', text),
    inputDescription: text => els.descriptionField().vm.$emit('input', text),
    submitForm: () => els.form().trigger('submit'),
  };
  return { wrapper, els, actions };
}

// We're expecting before we ought to.
describe('AssignmentDetailsModal', () => {
  it('in new assignment mode, if data is valid, makes a request after clicking submit', async () => {
    const { wrapper, actions } = makeWrapper({
      propsData: { ...defaultProps },
    });
    const expected = {
      active: false,
      title: 'Lesson 1',
      description: 'The first lesson',
      assignments: [defaultProps.classId],
      learner_ids: [],
    };
    actions.inputTitle('Lesson 1');
    actions.inputDescription('The first lesson');
    await wrapper.vm.submitData();
    expect(wrapper.emitted().submit[0][0]).toEqual(expected);
  });

  it('does not submit when form data is invalid', async () => {
    const { wrapper } = makeWrapper({
      propsData: { ...defaultProps },
    });
    await wrapper.vm.submitData();
    expect(wrapper.emitted().continue).toBeUndefined();
  });

  it('if the name has changed, makes a request after clicking submit', async () => {
    const { wrapper, actions } = makeWrapper({
      propsData: defaultProps,
    });
    const expected = {
      ...defaultProps.assignment,
      title: 'Old Lesson V2',
    };
    actions.inputTitle('Old Lesson V2');
    await wrapper.vm.submitData();
    expect(wrapper.emitted().submit[0][0]).toEqual(expected);
  });

  it('if the description has changed, makes a request after clicking submit', async () => {
    const { wrapper, actions } = makeWrapper({
      propsData: defaultProps,
    });
    const expected = {
      ...defaultProps.assignment,
      description: 'Its da remix',
    };
    actions.inputDescription('Its da remix');
    await wrapper.vm.submitData();
    expect(wrapper.emitted().submit[0][0]).toEqual(expected);
  });

  // not tested
  // changing assignments
  // more granular assignments
  // error handling (not implemented)
});
