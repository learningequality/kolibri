/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import { expect } from 'chai';
import { mount } from '@vue/test-utils';
import AssignmentDetailsModal from '../../src/views/assignments/AssignmentDetailsModal.vue';

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
  const wrapper = mount(AssignmentDetailsModal, options);
  const els = {
    titleField: () => wrapper.findAll({ name: 'kTextbox' }).at(0),
    descriptionField: () => wrapper.findAll({ name: 'kTextbox' }).at(1),
    form: () => wrapper.find('form'),
    uiError: () => wrapper.find({ name: 'ui-alert' }),
  };
  return { wrapper, els };
}

describe('AssignmentDetailsModal', () => {
  it('in new assignment mode, if data is valid, makes a request after clicking submit', () => {
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
    });
    const expected = {
      title: 'Lesson 1',
      description: 'The first lesson',
      assignments: [],
    };
    els.titleField().vm.$emit('input', 'Lesson 1');
    els.descriptionField().vm.$emit('input', 'The first lesson');
    els.form().trigger('submit');
    expect(wrapper.emitted().continue[0][0]).to.deep.equal(expected);
  });

  it('does not submit when form data is invalid', () => {
    const { wrapper, els } = makeWrapper({
      propsData: { ...defaultProps },
    });
    els.form().trigger('submit');
    expect(wrapper.emitted().continue).to.be.undefined;
  });

  describe('in edit mode', () => {
    const props = {
      ...defaultProps,
      isInEditMode: true,
      initialTitle: 'Old Lesson',
      initialDescription: 'Oldie but goodie',
    };

    it('in edit mode, if there are no changes, closes modal without making a server request', () => {
      const { wrapper, els } = makeWrapper({
        propsData: props,
      });
      els.form().trigger('submit');
      expect(wrapper.emitted().save).to.be.undefined;
      expect(wrapper.emitted().cancel.length).to.equal(1);
    });

    it('in edit mode, if the name has changed, makes a request after clicking submit', () => {
      const { wrapper, els } = makeWrapper({
        propsData: props,
      });
      const expected = {
        title: 'Old Lesson V2',
        description: props.initialDescription,
        assignments: [],
      };
      els.titleField().vm.$emit('input', 'Old Lesson V2');
      els.form().trigger('submit');
      expect(wrapper.emitted().save[0][0]).to.deep.equal(expected);
    });

    it('in edit mode, if the description has changed, makes a request after clicking submit', () => {
      const { wrapper, els } = makeWrapper({
        propsData: props,
      });
      const expected = {
        title: props.initialTitle,
        description: 'Its da remix',
        assignments: [],
      };
      els.descriptionField().vm.$emit('input', 'Its da remix');
      els.form().trigger('submit');
      expect(wrapper.emitted().save[0][0]).to.deep.equal(expected);
    });
  });

  // not tested
  // changing assignments
  // more granular assignments
  // error handling (not implemented)
});
