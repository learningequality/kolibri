<template>

  <KModal
    :title="$tr('enterChannelToken')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="formIsDisabled || $attrs.disabled"
    :cancelDisabled="formIsDisabled || $attrs.disabled"
    @submit="submitForm"
    @cancel="$emit('cancel')"
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
      :disabled="formIsDisabled || $attrs.disabled"
      autocapitalize="none"
      @blur="tokenIsBlurred = true"
    />
  </KModal>

</template>


<script>

  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { getRemoteChannelBundleByToken } from '../../modules/wizard/utils';

  export default {
    name: 'ChannelTokenModal',
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings],
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
            .then(channels => {
              this.$emit('submit', { token: this.token, channels });
            })
            .catch(error => {
              if (error.response.status === 404) {
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
        return getRemoteChannelBundleByToken(token);
      },
    },
    $trs: {
      channelTokenLabel: {
        message: 'Channel token',
        context:
          'Each Kolibri channel has its own token in Kolibri Studio. Users can freely view and browse resources to import from the public channels in Kolibri, but in order to import resources from private or unlisted channels, the user will need the channel token from the resources curator who assembled it.',
      },
      enterChannelToken: {
        message: 'Enter channel token',
        context: 'Prompt for entering the channel token.',
      },
      invalidTokenMessage: {
        message: 'Check whether you entered token correctly',
        context: 'Message that displays if Kolibri detects an invalid channel token.',
      },
      networkErrorMessage: {
        message: 'Unable to connect to token',
        context:
          'Message that displays if Kolibri is unable to connect to a channel using a token because of a network error.\n',
      },
      tokenExplanation: {
        message: 'Channel tokens unlock unlisted channels from Kolibri Studio',
        context: 'Description of a channel token.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
