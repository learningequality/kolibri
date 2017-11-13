<template>

  <core-modal
    :title="$tr('enterChannelToken')"
    :hideTopButtons="true"
  >
    <p>{{ $tr('tokenExplanation') }}</p>

    <form @submit.prevent="submitForm">
      <ui-alert
        v-if="tokenNetworkError"
        :dismissible="false"
        type="error"
      >
        {{ $tr('networkErrorMessage') }}
      </ui-alert>

      <k-textbox
        :label="$tr('channelTokenLabel')"
        v-model.trim="token"
        :invalid="!tokenIsValid"
        :invalidText="$tr('invalidTokenMessage')"
        @blur="tokenIsBlurred=true"
      />

      <div class="buttons">
        <k-button
          type="button"
          :text="$tr('cancel')"
          name="cancel"
          appearance="flat-button"
          @click="$emit('closemodal')"
        />
        <k-button
          type="submit"
          :text="$tr('confirm')"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import UiAlert from 'keen-ui/src/UiAlert';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';

  export default {
    name: 'channelTokenModal',
    components: {
      UiAlert,
      coreModal,
      kButton,
      kTextbox,
    },
    data() {
      return {
        token: '',
        formIsSubmitted: false,
        tokenIsBlurred: false,
        tokenLookupFailed: false,
        tokenNetworkError: false,
      };
    },
    computed: {
      tokenIsValid() {
        if (this.formIsSubmitted || this.tokenIsBlurred) {
          return !this.tokenLookupFailed && this.token !== '';
        }
        return true;
      },
    },
    methods: {
      submitForm() {
        this.formIsSubmitted = true;
        if (this.tokenIsValid) {
          return this.lookupToken(this.token)
            .then((channel) => {
              this.transitionWizardPage('forward', { channel })
            })
            .catch((error) => {
              if (error.status.code === 400) {
                this.tokenLookupFailed = true;
              } else {
                this.tokenNetworkError = true;
              }
            });
        }
        return Promise.resolve();
      },
    },
    vuex: {
      actions: {
        lookupToken() {

        },
        transitionWizardPage() {

        },
      },
    },
    $trs: {
      cancel: 'Cancel',
      channelTokenLabel: 'Channel token',
      confirm: 'Confirm',
      enterChannelToken: 'Enter channel token',
      invalidTokenMessage: 'Check whether you entered token correctly',
      networkErrorMessage: 'Unable to connect to token',
      tokenExplanation: 'Channel tokens unlock unlisted channels from Kolibri Studio',
    },
  };

</script>


<style lang="stylus" scoped></style>
