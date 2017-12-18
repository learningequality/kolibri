/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import { mount } from 'avoriaz';
import sinon from 'sinon';
import SelectedResourcesSize from '../../views/select-content-page/selected-resources-size.vue';
import kButton from 'kolibri.coreVue.components.kButton';
import UiAlert from 'keen-ui/src/UiAlert.vue';

function makeWrapper(props = {}) {
  const defaultProps = {
    mode: 'import',
    resourceCount: 10,
    fileSize: 10000000,
    spaceOnDrive: 5000000000,
  };

  return mount(SelectedResourcesSize, {
    propsData: { ...defaultProps, ...props },
  });
}

// prettier-ignore
function getElements(wrapper) {
  return {
    button: () => wrapper.first(kButton),
    buttonText: () => wrapper.first(kButton).text().trim(),
    chooseMsg: () => wrapper.first('.choose-message').text().trim(),
    notification: () => wrapper.find(UiAlert),
    remainingSpaceMsg: () => wrapper.first('.remaining-space').text().trim(),
    resourcesSelectedMsg: () => wrapper.first('.resources-selected-message').text().trim(),
  }
}

describe('selectedResourcesSize component', () => {
  it('shows the correct message and button when in import mode', () => {
    const wrapper = makeWrapper();
    const { chooseMsg, buttonText } = getElements(wrapper);
    assert.equal(chooseMsg(), 'Choose content to import');
    assert.equal(buttonText(), 'import');
  });

  it('shows the correct message and button when in export mode', () => {
    const wrapper = makeWrapper({ mode: 'export' });
    const { chooseMsg, buttonText } = getElements(wrapper);
    assert.equal(chooseMsg(), 'Choose content to export');
    assert.equal(buttonText(), 'export');
  });

  it('shows correct "resources selected" message given resourceCount & fileSize props', () => {
    const wrapper = makeWrapper();
    const { resourcesSelectedMsg } = getElements(wrapper);
    assert.equal(resourcesSelectedMsg(), 'Resources selected: 10 (9 MB)');
  });

  it('confirmation button is disabled when no resources are selected', () => {
    const wrapper = makeWrapper({
      resourceCount: 0,
      fileSize: 0,
    });
    const { button } = getElements(wrapper);
    assert.equal(button().getProp('disabled'), true);
  });

  it('confirmation button is disabled when remaining space is zero', () => {
    const wrapper = makeWrapper({
      resourceCount: 10,
      fileSize: 10,
      spaceOnDrive: 9,
    });
    const { button } = getElements(wrapper);
    assert.equal(button().getProp('disabled'), true);
  });

  it('when button is clicked, it emits an "clickconfirm" event', () => {
    const wrapper = makeWrapper();
    const emitSpy = sinon.spy(wrapper.vm, '$emit');
    const { button } = getElements(wrapper);
    button().trigger('click');
    return wrapper.vm.$nextTick().then(() => {
      sinon.assert.calledOnce(emitSpy);
      sinon.assert.calledWith(emitSpy, 'clickconfirm');
    });
  });

  it('confirmation button is enabled when some resources are selected', () => {
    const wrapper = makeWrapper({
      resourceCount: 1,
      fileSize: 10,
    });
    const { button } = getElements(wrapper);
    assert.equal(button().getProp('disabled'), false);
  });

  it('shows the "remaining space message"', () => {
    const wrapper = makeWrapper();
    const { remainingSpaceMsg } = getElements(wrapper);
    assert.equal(remainingSpaceMsg(), 'Your remaining space: 4 GB');
  });

  it('shows an error notification when remaining space goes to zero', () => {
    const wrapper = makeWrapper();
    const { notification } = getElements(wrapper);
    assert.deepEqual(notification(), []);
    wrapper.setProps({ fileSize: 100000000000000 });
    return wrapper.vm
      .$nextTick()
      .then(() => {
        assert(notification()[0].isVueComponent);
        wrapper.setProps({ fileSize: 100 });
        return wrapper.vm.$nextTick();
      })
      .then(() => {
        // Then disappears if it goes back above zero
        assert.deepEqual(notification(), []);
      });
  });
});
