/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import assert from 'assert';
import { mount } from 'avoriaz';
import SelectContentPage from '../../views/select-content-page';

function makeWrapper(props = {}) {
  return mount(SelectContentPage, {...props});
}
describe('selectContentPage', () => {
  it('mounts', () => {
    const wrapper = makeWrapper();
  });

  it('shows the thumbnail, title, descripton, and version of the channel', () => {

  });

  it('shows the total size of the channel', () => {

  });

  it('if resources are on the device, it shows the total size of those', () => {

  });

  it('if a new version is available, a update notification and button appear', () => {

  });

  it('if a new version is not available, then no notification/button appear', () => {

  });

  it('if the device is undergoing database upload, then the size display and tree view are not shown', () => {

  });

  it('the correct props are passed to the size display component', () => {

  });

  it('the corrct props are passed to the tree view component', () => {

  });
});
