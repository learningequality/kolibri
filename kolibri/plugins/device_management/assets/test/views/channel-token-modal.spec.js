/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import { mount } from '@vue/test-utils';
import { expect } from 'chai';
import sinon from 'sinon';
import ChannelTokenModal from '../../src/views/available-channels-page/channel-token-modal';

function makeWrapper() {
  return mount(ChannelTokenModal);
}

function getElements(wrapper) {
  return {
    cancelButton: () => wrapper.find('button[name="cancel"]'),
    tokenTextbox: () => wrapper.find({ name: 'kTextbox' }),
    networkErrorAlert: () => wrapper.find({ name: 'ui-alert' }),
    lookupTokenStub: () => sinon.stub(wrapper.vm, 'lookupToken'),
  };
}

describe('channelTokenModal component', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('pressing "cancel" emits a close modal event', () => {
    const { cancelButton } = getElements(wrapper);
    cancelButton().trigger('click');
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.emitted().closemodal.length).to.equal(1);
    });
  });

  describe('submitting a token', () => {
    function inputToken(wrapper, token) {
      const textbox = getElements(wrapper).tokenTextbox();
      textbox.vm.$emit('input', token);
      return wrapper.vm.$nextTick().then(() => {
        expect(textbox.props().value).to.equal(token.trim());
      });
    }

    function assertTextboxInvalid(wrapper) {
      const textbox = getElements(wrapper).tokenTextbox();
      expect(textbox.props().invalid).to.be.true;
      expect(textbox.props().invalidText).to.equal('Check whether you entered token correctly');
    }

    it('if user has not interacted with the form, then no validation messages appear', () => {
      const { tokenTextbox, networkErrorAlert } = getElements(wrapper);
      expect(tokenTextbox().props().invalid).to.be.false;
      expect(networkErrorAlert().exists()).to.be.false;
    });

    it('disables the form while waiting for a response from the server', () => {
      //...then re-enables it afterwards
      const { lookupTokenStub } = getElements(wrapper);
      const lookupStub = lookupTokenStub();
      const disabledSpy = sinon.spy();
      wrapper.vm.$watch('formIsDisabled', disabledSpy);
      // not checking the Promise.reject case
      lookupStub.returns(Promise.resolve([]));
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          wrapper.vm.submitForm();
        })
        .then(() => {
          expect(disabledSpy.firstCall.args[0]).to.be.true;
          expect(disabledSpy.firstCall.args[1]).to.be.false;
        });
    });

    it('emits a "channel found" event  if token lookup is successful', () => {
      const tokenPayload = { id: 'toka-toka-token' };
      const { lookupTokenStub } = getElements(wrapper);
      const lookupStub = lookupTokenStub();
      lookupStub.returns(Promise.resolve([tokenPayload]));
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          wrapper.vm.submitForm();
        })
        .then(() => {
          sinon.assert.calledWith(lookupStub, 'toka-toka-token');
          expect(wrapper.emitted().channelfound).to.deep.equal([[tokenPayload]]);
        });
    });

    it('on submit, shows a validation message when token code is empty', () => {
      return inputToken(wrapper, '    ')
        .then(() => {
          // HACK: Clicking the submit button does not propagate to the form, so calling
          // submit method directly
          return wrapper.vm.submitForm();
        })
        .then(() => {
          assertTextboxInvalid(wrapper);
        });
    });

    it('on blur, shows a validation message when token code is empty', () => {
      const textbox = getElements(wrapper).tokenTextbox();
      return inputToken(wrapper, '    ')
        .then(() => {
          // Reaching into ui-textbox's blur to trigger it on k-textbox
          textbox.vm.$refs.textbox.$emit('blur');
          return wrapper.vm.$nextTick();
        })
        .then(() => {
          assertTextboxInvalid(wrapper);
        });
    });

    it('if the token does not point to a channel (404 code), shows a validation message', () => {
      const tokenPayload = { status: { code: 404 } };
      const { lookupTokenStub } = getElements(wrapper);
      const lookupStub = lookupTokenStub();
      lookupStub.returns(Promise.reject(tokenPayload));
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          return wrapper.vm.submitForm();
        })
        .then(() => {
          sinon.assert.calledWith(lookupStub, 'toka-toka-token');
          expect(wrapper.emittedByOrder().length).to.equal(0);
          assertTextboxInvalid(wrapper);
        });
    });

    it('shows an ui-alert error if there is a generic network error (other error code)', () => {
      const tokenPayload = { status: { code: 500 } };
      const { tokenTextbox, networkErrorAlert, lookupTokenStub } = getElements(wrapper);
      const textbox = tokenTextbox();
      const lookupStub = lookupTokenStub();
      lookupStub.returns(Promise.reject(tokenPayload));
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          return wrapper.vm.submitForm();
        })
        .then(() => {
          sinon.assert.calledWith(lookupStub, 'toka-toka-token');
          expect(wrapper.emittedByOrder().length).to.equal(0);
          expect(textbox.props().invalid).to.be.false;
          expect(networkErrorAlert().isVueInstance()).to.be.true;
        });
    });
  });
});
