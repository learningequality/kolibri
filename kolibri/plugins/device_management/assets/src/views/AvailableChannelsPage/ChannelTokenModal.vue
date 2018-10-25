<template>

  <KModal
    :title="$tr('enterChannelToken')"
    :submitText="$tr('continueButtonLabel')"
    :cancelText="$tr('cancel')"
    :submitDisabled="formIsDisabled"
    :cancelDisabled="formIsDisabled"
    @submit="submitForm"
    @cancel="$emit('closemodal')"
  >
    <p>{{ $tr('tokenExplanation') }}</p>

    <UiAlert
      v-if="tokenNetworkError"
      :dismissible="false"
      type="error"
    >
      {{ $tr('networkErrorMessage') }}
    </UiAlert>

    <KTextbox
      v-model.trim="token"
      :label="$tr('channelTokenLabel')"
      :invalid="!tokenIsValid"
      :invalidText="$tr('invalidTokenMessage')"
      autofocus
      :disabled="formIsDisabled"
      @blur="tokenIsBlurred=true"
    />
  </KModal>

</template>


<script>

  import UiAlert from 'keen-ui/src/UiAlert';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import { getRemoteChannelByToken } from '../../modules/wizard/utils';

  export default {
    name: 'ChannelTokenModal',
    components: {
      UiAlert,
      KModal,
      KTextbox,
    },
    data() {
      return {
        formIsDisabled: false,
        formIsSubmitted: false,
        token: '',
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
        this.tokenLookupFailed = false;
        this.formIsSubmitted = true;
        if (this.tokenIsValid) {
          this.formIsDisabled = true;
          return this.lookupToken(this.token)
            .then(([channel]) => {
              this.$emit('channelfound', channel);
            })
            .catch(error => {
              if (error.status.code === 404) {
                this.tokenLookupFailed = true;
              } else {
                this.tokenNetworkError = true;
              }
            })
            .then(() => {
              this.formIsDisabled = false;
            });
        }
        return Promise.resolve();
      },
      lookupToken(token) {
        return getRemoteChannelByToken(token);
      },
    },
    $trs: {
      cancel: 'Cancel',
      channelTokenLabel: 'Channel token',
      continueButtonLabel: 'Continue',
      enterChannelToken: 'Enter channel token',
      invalidTokenMessage: 'Check whether you entered token correctly',
      networkErrorMessage: 'Unable to connect to token',
      tokenExplanation: 'Channel tokens unlock unlisted channels from Kolibri Studio',
    },
  };

</script>


<style lang="scss" scoped></style>
