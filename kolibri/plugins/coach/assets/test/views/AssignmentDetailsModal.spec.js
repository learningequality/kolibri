import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import AssignmentDetailsModal from '../../src/views/plan/assignments/AssignmentDetailsModal';

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
  options.store = store;
  const wrapper = mount(AssignmentDetailsModal, options);
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

describe('AssignmentDetailsModal', () => {
  it('in new assignment mode, if data is valid, makes a request after clicking submit', () => {
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
    actions.submitForm();
    expect(wrapper.emitted().continue[0][0]).toEqual(expected);
  });

  it('does not submit when form data is invalid', () => {
    const { wrapper, actions } = makeWrapper({
      propsData: { ...defaultProps },
    });
    actions.submitForm();
    expect(wrapper.emitted().continue).toBeUndefined();
  });

  describe('in edit mode', () => {
    const props = {
      ...defaultProps,
      isInEditMode: true,
      initialTitle: 'Old Lesson',
      initialDescription: 'Oldie but goodie',
    };

    it('in edit mode, if there are no changes, closes modal without making a server request', () => {
      const { wrapper, actions } = makeWrapper({
        propsData: props,
      });
      actions.submitForm();
      expect(wrapper.emitted().save).toBeUndefined();
      expect(wrapper.emitted().cancel.length).toEqual(1);
    });

    it('in edit mode, if the name has changed, makes a request after clicking submit', () => {
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
      actions.submitForm();
      expect(wrapper.emitted().save[0][0]).toEqual(expected);
    });

    it('in edit mode, if the description has changed, makes a request after clicking submit', () => {
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
      actions.submitForm();
      expect(wrapper.emitted().save[0][0]).toEqual(expected);
    });
  });

  // not tested
  // changing assignments
  // more granular assignments
  // error handling (not implemented)
});
