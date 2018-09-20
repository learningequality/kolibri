import { mount } from '@vue/test-utils';
import KButton from 'kolibri.coreVue.components.KButton';
import UiAlert from 'keen-ui/src/UiAlert';
import SelectedResourcesSize from '../../src/views/SelectContentPage/SelectedResourcesSize';

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
    button: () => wrapper.find(KButton),
    buttonText: () => wrapper.find(KButton).text().trim(),
    chooseMsg: () => wrapper.find('.choose-message').text().trim(),
    notification: () => wrapper.find(UiAlert),
    availableSpaceMsg: () => wrapper.find('.available-space').text().trim(),
    resourcesSelectedMsg: () => wrapper.find('.resources-selected-message').text().trim(),
  }
}

describe('selectedResourcesSize component', () => {
  it('shows the correct message and button when in import mode', () => {
    const wrapper = makeWrapper();
    const { chooseMsg, buttonText } = getElements(wrapper);
    expect(chooseMsg()).toEqual('Choose content to import');
    expect(buttonText()).toEqual('import');
  });

  it('shows the correct message and button when in export mode', () => {
    const wrapper = makeWrapper({ mode: 'export' });
    const { chooseMsg, buttonText } = getElements(wrapper);
    expect(chooseMsg()).toEqual('Choose content to export');
    expect(buttonText()).toEqual('export');
  });

  it('shows correct "resources selected" message given resourceCount & fileSize props', () => {
    const wrapper = makeWrapper();
    const { resourcesSelectedMsg } = getElements(wrapper);
    expect(resourcesSelectedMsg()).toEqual('Content selected: 10 MB (10 resources)');
  });

  it('confirmation button is disabled when no resources are selected', () => {
    const wrapper = makeWrapper({
      resourceCount: 0,
      fileSize: 0,
    });
    const { button } = getElements(wrapper);
    expect(button().props().disabled).toEqual(true);
  });

  it('confirmation button is disabled when remaining space is zero', () => {
    const wrapper = makeWrapper({
      resourceCount: 10,
      fileSize: 10,
      spaceOnDrive: 9,
    });
    const { button } = getElements(wrapper);
    expect(button().props().disabled).toEqual(true);
  });

  it('when button is clicked, it emits an "clickconfirm" event', () => {
    const wrapper = makeWrapper();
    const { button } = getElements(wrapper);
    button().trigger('click');
    expect(wrapper.emitted().clickconfirm.length).toEqual(1);
  });

  it('confirmation button is enabled when some resources are selected', () => {
    const wrapper = makeWrapper({
      resourceCount: 1,
      fileSize: 10,
    });
    const { button } = getElements(wrapper);
    expect(button().props().disabled).toEqual(false);
  });

  it('shows the "remaining space message"', () => {
    const wrapper = makeWrapper();
    const { availableSpaceMsg } = getElements(wrapper);
    expect(availableSpaceMsg()).toEqual('Drive space available: 5 GB');
  });

  it('shows an error notification when remaining space goes to zero', () => {
    const wrapper = makeWrapper();
    const { notification } = getElements(wrapper);
    expect(notification().exists()).toEqual(false);
    wrapper.setProps({ fileSize: 100000000000000 });
    expect(notification().exists()).toEqual(true);
    wrapper.setProps({ fileSize: 100 });
    expect(notification().exists()).toEqual(false);
  });
});
