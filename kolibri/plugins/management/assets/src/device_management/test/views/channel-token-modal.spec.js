/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import { mount } from 'avoriaz';
import sinon from 'sinon';
import ChannelTokenModal from '../../views/available-channels-page/channel-token-modal';
import kTextbox from 'kolibri.coreVue.components.kTextbox';
import UiAlert from 'keen-ui/src/UiAlert';

// import kButton from 'kolibri.coreVue.components.kButton';

function makeWrapper() {
  return mount(ChannelTokenModal, {
    store: new Vuex.Store(),
  });
}

function getElements(wrapper) {
  return {
    cancelButton: () => wrapper.first('button[name="cancel"]'),
    tokenTextbox: () => wrapper.first(kTextbox),
    networkErrorAlert: () => wrapper.find(UiAlert),
  };
}

describe.only('channelTokenModal component', () => {
  it('pressing "cancel" emits a close modal event', () => {
    const wrapper = makeWrapper();
    const emitSpy = sinon.spy(wrapper.vm, '$emit');
    const { cancelButton } = getElements(wrapper);
    cancelButton().trigger('click');
    return wrapper.vm.$nextTick()
      .then(() => {
        sinon.assert.calledWith(emitSpy, 'closemodal');
      });
  });

  describe('submitting a token', () => {
    function inputToken(wrapper, token) {
      const textbox = getElements(wrapper).tokenTextbox();
      textbox.vm.$emit('input', token);
      return wrapper.vm.$nextTick()
        .then(() => {
          assert.equal(textbox.getProp('value'), token.trim());
        });
    }

    function assertTextboxInvalid(wrapper) {
      const textbox = getElements(wrapper).tokenTextbox();
      assert.equal(textbox.getProp('invalid'), true);
      assert.equal(textbox.getProp('invalidText'), 'Check whether you entered token correctly');
    }

    it('if user has not interacted with the form, then no validation messages appear', () => {
      const wrapper = makeWrapper();
      const { tokenTextbox, networkErrorAlert }= getElements(wrapper);
      assert.equal(tokenTextbox().getProp('invalid'), false);
      assert.deepEqual(networkErrorAlert(), []);
    });

    it('triggers a wizard forward transition action if token lookup is successful', () => {
      const tokenPayload = { id: 'toka-toka-token' };
      const wrapper = makeWrapper();
      const lookupTokenStub = sinon.stub(wrapper.vm, 'lookupToken');
      const transitionStub = sinon.stub(wrapper.vm, 'transitionWizardPage');
      lookupTokenStub.returns(Promise.resolve(tokenPayload));
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          wrapper.vm.submitForm();
        })
        .then(() => {
          sinon.assert.calledWith(lookupTokenStub, 'toka-toka-token');
          sinon.assert.calledWith(transitionStub, 'forward', { channel: tokenPayload });
        });
    });

    it('on submit, shows a validation message when token code is empty', () => {
      const wrapper = makeWrapper();
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
      const wrapper = makeWrapper();
      const textbox = getElements(wrapper).tokenTextbox();
      return inputToken(wrapper, '    ', false)
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
      const wrapper = makeWrapper();
      const lookupTokenStub = sinon.stub(wrapper.vm, 'lookupToken');
      const transitionStub = sinon.stub(wrapper.vm, 'transitionWizardPage');
      lookupTokenStub.returns(Promise.reject(tokenPayload));
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          return wrapper.vm.submitForm();
        })
        .then(() => {
          sinon.assert.calledWith(lookupTokenStub, 'toka-toka-token');
          sinon.assert.notCalled(transitionStub);
        });
    });

    it('shows an ui-alert error if there is a generic network error (other error code)', () => {
      const tokenPayload = { status: { code: 500 } };
      const wrapper = makeWrapper();
      const { tokenTextbox, networkErrorAlert } = getElements(wrapper);
      const textbox = tokenTextbox();
      const lookupTokenStub = sinon.stub(wrapper.vm, 'lookupToken');
      const transitionStub = sinon.stub(wrapper.vm, 'transitionWizardPage');
      lookupTokenStub.returns(Promise.reject(tokenPayload));
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          return wrapper.vm.submitForm();
        })
        .then(() => {
          sinon.assert.calledWith(lookupTokenStub, 'toka-toka-token');
          sinon.assert.notCalled(transitionStub);
          assert.equal(textbox.getProp('invalid'), false);
          assert(networkErrorAlert()[0].isVueComponent);
        });
    });
  });
});
