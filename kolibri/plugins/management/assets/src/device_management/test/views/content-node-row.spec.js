/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import sinon from 'sinon';
import { mount } from 'avoriaz';
import assert from 'assert';
import ContentNodeRow from '../../views/select-content-page/content-node-row.vue';

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
    propsData: Object.assign({}, defaultProps, props),
  });
}

describe('contentNodeRow component', () => {
  it('shows the correct title', () => {
    const wrapper = makeWrapper();
    const titleText = wrapper.first('.title').text().trim();
    assert.equal(titleText, 'Awesome Content');
  });

  it('shows the correct message', () => {
    const wrapper = makeWrapper();
    const messageText = wrapper.first('.message').text().trim();
    assert.equal(messageText, 'HELLO');
  });

  it('when node is a topic, title is a button', () => {
    const wrapper = makeWrapper();
    const button = wrapper.first('button[name="select-node"]');
    const goToTopicSpy = sinon.spy(wrapper.vm, 'goToTopic');
    button.trigger('click');
    return wrapper.vm.$nextTick()
    .then(() => {
      sinon.assert.calledOnce(goToTopicSpy);
      sinon.assert.calledWith(goToTopicSpy, 'awesome_content');
    });
  });
});
