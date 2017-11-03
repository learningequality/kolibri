/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { mount } from 'avoriaz';
import SelectDriveModal from '../../views/manage-content-page/wizards/select-drive-modal';

function makeWrapper() {
  return mount(SelectDriveModal, {});
}

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        wizardState: {
          page: '',
        },
      },
    },
  });
}

describe('selectDriveModal component', () => {
  it('when importing, shows the correct title', () => {

  });

  it('when exporting, shows the correct title', () => {

  });

  it('when drive list is loading, show a message', () => {

  });

  it('shows the drive list', () => {

  });

  it('drive list does not include the local drive', () => {

  });

  it('if there are no drives, there is an empty state', () => {

  });

  it('when no drive is selected, "Continue" button is disabled', () => {
    // also handles case where drive list has not been loaded yet

  });

  it('when a drive is selected, "Continue" button is enabled', () => {

  });

  it('clicking "Continue" triggers a "transitionWizardPage" action', () => {

  });

  it('clicking "Cancel" triggers a "transitionWizardPage" action', () => {

  });
});
