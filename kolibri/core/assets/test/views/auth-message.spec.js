/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import { shallow } from '@vue/test-utils';
import AuthMessage from '../../src/views/auth-message';

function makeWrapper(options) {
  return shallow(AuthMessage, options);
}

// prettier-ignore
function getElements(wrapper) {
  return {
    headerText: () => wrapper.find('.auth-message h1').text().trim(),
    detailsText: () => wrapper.find('.auth-message p').text().trim(),
  };
}

describe('auth message component', () => {
  it('shows the correct details when there are no props', () => {
    const wrapper = makeWrapper({ propsData: {} });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).to.equal('Did you forget to sign in?');
    expect(detailsText()).to.equal('You must be signed in to view this page');
  });

  it('shows the correct details when authorized role is "learner"', () => {
    const wrapper = makeWrapper({ propsData: { authorizedRole: 'learner' } });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).to.equal('Did you forget to sign in?');
    expect(detailsText()).to.equal('You must be signed in as a Learner to view this page');
  });

  it('shows the correct details when authorized role is "admin"', () => {
    const wrapper = makeWrapper({ propsData: { authorizedRole: 'admin' } });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).to.equal('Did you forget to sign in?');
    expect(detailsText()).to.equal('You must be signed in as an Admin to view this page');
  });

  it('shows correct text when both texts manually provided as prop', () => {
    const wrapper = makeWrapper({
      propsData: {
        header: 'Signed in as device owner',
        details: 'Cannot be used by device owner',
      },
    });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).to.equal('Signed in as device owner');
    expect(detailsText()).to.equal('Cannot be used by device owner');
  });

  it('shows correct text when one text manually provided as prop', () => {
    const wrapper = makeWrapper({
      propsData: {
        details: 'Must be device owner to manage content',
      },
    });
    const { headerText, detailsText } = getElements(wrapper);
    expect(headerText()).to.equal('Did you forget to sign in?');
    expect(detailsText()).to.equal('Must be device owner to manage content');
  });
});
