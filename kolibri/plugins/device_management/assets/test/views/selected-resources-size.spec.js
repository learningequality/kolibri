/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import { expect } from 'chai';
import { mount } from '@vue/test-utils';
import kButton from 'kolibri.coreVue.components.kButton';
import UiAlert from 'keen-ui/src/UiAlert.vue';
import SelectedResourcesSize from '../../src/views/select-content-page/selected-resources-size.vue';

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
    button: () => wrapper.find(kButton),
    buttonText: () => wrapper.find(kButton).text().trim(),
    chooseMsg: () => wrapper.find('.choose-message').text().trim(),
    notification: () => wrapper.find(UiAlert),
    remainingSpaceMsg: () => wrapper.find('.remaining-space').text().trim(),
    resourcesSelectedMsg: () => wrapper.find('.resources-selected-message').text().trim(),
  }
}

describe('selectedResourcesSize component', () => {
  it('shows the correct message and button when in import mode', () => {
    const wrapper = makeWrapper();
    const { chooseMsg, buttonText } = getElements(wrapper);
    expect(chooseMsg()).to.equal('Choose content to import');
    expect(buttonText()).to.equal('import');
  });

  it('shows the correct message and button when in export mode', () => {
    const wrapper = makeWrapper({ mode: 'export' });
    const { chooseMsg, buttonText } = getElements(wrapper);
    expect(chooseMsg()).to.equal('Choose content to export');
    expect(buttonText()).to.equal('export');
  });

  it('shows correct "resources selected" message given resourceCount & fileSize props', () => {
    const wrapper = makeWrapper();
    const { resourcesSelectedMsg } = getElements(wrapper);
    expect(resourcesSelectedMsg()).to.equal('Resources selected: 10 (9 MB)');
  });

  it('confirmation button is disabled when no resources are selected', () => {
    const wrapper = makeWrapper({
      resourceCount: 0,
      fileSize: 0,
    });
    const { button } = getElements(wrapper);
    expect(button().props().disabled).to.be.true;
  });

  it('confirmation button is disabled when remaining space is zero', () => {
    const wrapper = makeWrapper({
      resourceCount: 10,
      fileSize: 10,
      spaceOnDrive: 9,
    });
    const { button } = getElements(wrapper);
    expect(button().props().disabled).to.be.true;
  });

  it('when button is clicked, it emits an "clickconfirm" event', () => {
    const wrapper = makeWrapper();
    const { button } = getElements(wrapper);
    button().trigger('click');
    expect(wrapper.emitted().clickconfirm.length).to.equal(1);
  });

  it('confirmation button is enabled when some resources are selected', () => {
    const wrapper = makeWrapper({
      resourceCount: 1,
      fileSize: 10,
    });
    const { button } = getElements(wrapper);
    expect(button().props().disabled).to.be.false;
  });

  it('shows the "remaining space message"', () => {
    const wrapper = makeWrapper();
    const { remainingSpaceMsg } = getElements(wrapper);
    expect(remainingSpaceMsg()).to.equal('Your remaining space: 4 GB');
  });

  it('shows an error notification when remaining space goes to zero', () => {
    const wrapper = makeWrapper();
    const { notification } = getElements(wrapper);
    expect(notification().exists()).to.be.false;
    wrapper.setProps({ fileSize: 100000000000000 });
    expect(notification().exists()).to.be.true;
    wrapper.setProps({ fileSize: 100 });
    expect(notification().exists()).to.be.false;
  });
});
