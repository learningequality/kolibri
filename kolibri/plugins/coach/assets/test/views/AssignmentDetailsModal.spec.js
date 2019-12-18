import { mount } from '@vue/test-utils';
//import store from 'kolibri.coreVue.vuex.store';
import makeStore from '../makeStore';
//import adHocLearners from '../../src/modules/adHocLearners';
import AssignmentDetailsModal from '../../src/views/plan/assignments/AssignmentDetailsModal';

// HACK to avoid having to mock this property's dependancies on vuex and vue router
AssignmentDetailsModal.computed.titleIsInvalidText = () => '';

const defaultProps = {
  initialDescription: '',
  initialSelectedCollectionIds: [],
  initialTitle: '',
  isInEditMode: false,
  modalTitle: '',
  showDescriptionField: '',
  submitErrorMessage: '',
  classId: 'class_1',
  groups: [],
};

function makeWrapper(options) {
  options.store = makeStore();
  const wrapper = mount(AssignmentDetailsModal, options);
  wrapper.vm.handleAdHocLearnersGroupPromise = jest.fn().mockResolvedValue();
  wrapper.vm.handleUpdateAdHocLearnersGroupPromise = jest.fn().mockResolvedValue();
  const els = {
    titleField: () => wrapper.findAll({ name: 'KTextbox' }).at(0),
    descriptionField: () => wrapper.findAll({ name: 'KTextbox' }).at(1),
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
      assignments: [],
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

  describe('in edit mode', () => {
    const props = {
      ...defaultProps,
      isInEditMode: true,
      initialTitle: 'Old Lesson',
      initialDescription: 'Oldie but goodie',
    };

    it('in edit mode, if there are no changes, closes modal without making a server request', async () => {
      const { wrapper } = makeWrapper({
        propsData: props,
      });
      await wrapper.vm.submitData();
      expect(wrapper.emitted().submit[0][0]).toEqual(null);
    });

    it('in edit mode, if the name has changed, makes a request after clicking submit', async () => {
      const { wrapper, actions } = makeWrapper({
        propsData: props,
      });
      const expected = {
        active: false,
        title: 'Old Lesson V2',
        description: props.initialDescription,
        assignments: [],
      };
      actions.inputTitle('Old Lesson V2');
      await wrapper.vm.submitData();
      expect(wrapper.emitted().submit[0][0]).toEqual(expected);
    });

    it('in edit mode, if the description has changed, makes a request after clicking submit', async () => {
      const { wrapper, actions } = makeWrapper({
        propsData: props,
      });
      const expected = {
        active: false,
        title: props.initialTitle,
        description: 'Its da remix',
        assignments: [],
      };
      actions.inputDescription('Its da remix');
      await wrapper.vm.submitData();
      expect(wrapper.emitted().submit[0][0]).toEqual(expected);
    });
  });

  // not tested
  // changing assignments
  // more granular assignments
  // error handling (not implemented)
});
