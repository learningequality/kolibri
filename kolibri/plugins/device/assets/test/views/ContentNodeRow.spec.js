import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import ContentNodeRow from '../../src/views/SelectContentPage/ContentNodeRow';
import { makeNode } from '../utils/data';
import router from './testRouter';

//
const defaultProps = {
  node: {
    title: 'Awesome Content',
    kind: 'topic',
    id: 'awesome_content',
  },
  message: 'HELLO',
  getLinkObject(node) {
    return {
      name: 'SELECT_CONTENT',
      query: {
        node_id: node.id,
      },
    };
  },
};

function makeWrapper(props = {}) {
  return mount(ContentNodeRow, {
    propsData: { ...defaultProps, ...props },
    store,
    ...router,
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    titleText: () => wrapper.find('.title').text().trim(),
    messageText: () => wrapper.find('.message').text().trim(),
    goToTopicButton: () => wrapper.find('a[name="select-node"]'),
    checkbox: () => wrapper.find('input[type="checkbox"]'),
    KCheckbox: () => wrapper.find({ name: 'KCheckbox' }),
  };
}

describe('contentNodeRow component', () => {
  it('shows the correct title', () => {
    const wrapper = makeWrapper();
    const { titleText } = getElements(wrapper);
    expect(titleText()).toEqual('Awesome Content');
  });

  it('shows the correct message', () => {
    const wrapper = makeWrapper();
    const { messageText } = getElements(wrapper);
    expect(messageText()).toEqual('HELLO');
  });

  it('when node is not a topic, title is just text', () => {
    const wrapper = makeWrapper({
      node: makeNode('1', {
        kind: 'video',
      }),
    });
    const { goToTopicButton, titleText } = getElements(wrapper);
    expect(goToTopicButton().exists()).toEqual(false);
    expect(titleText()).toEqual('node_1');
  });

  it('when node is disabled, title is just text', () => {
    const wrapper = makeWrapper({ disabled: true });
    const { goToTopicButton, titleText } = getElements(wrapper);
    expect(goToTopicButton()[0]).toEqual(undefined);
    expect(titleText()).toEqual('Awesome Content');
  });

  it('topic links have the correct route', () => {
    const wrapper = makeWrapper({ store });
    const { goToTopicButton } = getElements(wrapper);
    expect(goToTopicButton().props().to).toMatchObject({
      name: 'SELECT_CONTENT',
      query: {
        node_id: 'awesome_content',
      },
    });
  });

  it('when checkbox is changed, it emits a "changeselection" event', () => {
    const wrapper = makeWrapper();
    const { checkbox } = getElements(wrapper);
    // have to "click" the inner checkbox to trigger "change" on whole component
    checkbox().trigger('click');
    expect(wrapper.emitted().changeselection).toEqual([[wrapper.vm.node]]);
  });

  it('when props.disabled, the checkbox is disabled', () => {
    const wrapper = makeWrapper({ disabled: true });
    const { checkbox } = getElements(wrapper);
    expect(checkbox().attributes().disabled).toEqual('disabled');
  });

  it('when props.checked, the checkbox is checked', () => {
    const wrapper = makeWrapper({
      disabled: true,
      checked: true,
    });
    // For some reason, the HTML for the actual checkbox does not have checked attribute
    const { KCheckbox } = getElements(wrapper);
    expect(KCheckbox().props().checked).toEqual(true);
  });

  it('when props.determinate, the checkbox is indeterminate', () => {
    const wrapper = makeWrapper({
      disabled: true,
      checked: true,
      indeterminate: true,
    });
    const { KCheckbox } = getElements(wrapper);
    expect(KCheckbox().props().indeterminate).toEqual(true);
  });
});
