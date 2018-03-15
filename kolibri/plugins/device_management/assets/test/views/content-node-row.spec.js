/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import sinon from 'sinon';
import { mount } from '@vue/test-utils';
import assert from 'assert';
import ContentNodeRow from '../../src/views/select-content-page/content-node-row.vue';
import { makeNode } from '../utils/data';
import kCheckbox from 'kolibri.coreVue.components.kCheckbox';

const defaultProps = {
  node: {
    title: 'Awesome Content',
    kind: 'topic',
    id: 'awesome_content',
  },
  message: 'HELLO',
};

function makeWrapper(props = {}) {
  return mount(ContentNodeRow, {
    propsData: { ...defaultProps, ...props },
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    titleText: () => wrapper.find('.title').text().trim(),
    messageText: () => wrapper.find('.message').text().trim(),
    goToTopicButton: () => wrapper.find('button[name="select-node"]'),
    checkbox: () => wrapper.find('input[type="checkbox"]'),
    kCheckbox: () => wrapper.find(kCheckbox),
  };
}

describe('contentNodeRow component', () => {
  it('shows the correct title', () => {
    const wrapper = makeWrapper();
    const { titleText } = getElements(wrapper);
    assert.equal(titleText(), 'Awesome Content');
  });

  it('shows the correct message', () => {
    const wrapper = makeWrapper();
    const { messageText } = getElements(wrapper);
    assert.equal(messageText(), 'HELLO');
  });

  it('when node is a topic, title is a button that emits "clicktopic" event', () => {
    const wrapper = makeWrapper();
    const { goToTopicButton } = getElements(wrapper);
    const emitSpy = sinon.spy(wrapper.vm, '$emit');
    goToTopicButton().trigger('click');
    sinon.assert.calledOnce(emitSpy);
    sinon.assert.calledWith(emitSpy, 'clicktopic', wrapper.vm.node);
  });

  it('when node is not a topic, title is just text', () => {
    const wrapper = makeWrapper({
      node: makeNode('1', {
        kind: 'video',
      }),
    });
    const { goToTopicButton, titleText } = getElements(wrapper);
    assert.equal(goToTopicButton().exists(), false);
    assert.equal(titleText(), 'node_1');
  });

  it('when node is disabled, title is just text', () => {
    const wrapper = makeWrapper({ disabled: true });
    const { goToTopicButton, titleText } = getElements(wrapper);
    assert.equal(goToTopicButton()[0], undefined);
    assert.equal(titleText(), 'Awesome Content');
  });

  it('when checkbox is changed, it emits a "changeselection" event', () => {
    const wrapper = makeWrapper();
    const { checkbox } = getElements(wrapper);
    const emitSpy = sinon.spy(wrapper.vm, '$emit');
    // have to "click" the inner checkbox to trigger "change" on whole component
    checkbox().trigger('click');
    sinon.assert.calledOnce(emitSpy);
    sinon.assert.calledWith(emitSpy, 'changeselection', wrapper.vm.node);
  });

  it('when props.disabled, the checkbox is disabled', () => {
    const wrapper = makeWrapper({ disabled: true });
    const { checkbox } = getElements(wrapper);
    assert.equal(checkbox().attributes().disabled, 'disabled');
  });

  it('when props.checked, the checkbox is checked', () => {
    const wrapper = makeWrapper({
      disabled: true,
      checked: true,
    });
    // For some reason, the HTML for the actual checkbox does not have checked attribute
    const { kCheckbox } = getElements(wrapper);
    assert.equal(kCheckbox().props().checked, true);
  });

  it('when props.determinate, the checkbox is indeterminate', () => {
    const wrapper = makeWrapper({
      disabled: true,
      checked: true,
      indeterminate: true,
    });
    const { kCheckbox } = getElements(wrapper);
    assert.equal(kCheckbox().props().indeterminate, true);
  });
});
