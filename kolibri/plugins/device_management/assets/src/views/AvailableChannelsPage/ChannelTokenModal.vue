<template>

  <KModal
    :title="$tr('enterChannelToken')"
    :submitText="coreCommon$tr('continueAction')"
    :cancelText="coreCommon$tr('cancelAction')"
    :submitDisabled="formIsDisabled"
    :cancelDisabled="formIsDisabled"
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
      :disabled="formIsDisabled"
      @blur="tokenIsBlurred=true"
    />
  </KModal>

</template>


<script>

  import { mapMutations } from 'vuex';
  import UiAlert from 'keen-ui/src/UiAlert';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import { getRemoteChannelBundleByToken } from '../../modules/wizard/utils';

  export default {
    name: 'ChannelTokenModal',
    components: {
      UiAlert,
      KModal,
      KTextbox,
    },
    mixins: [coreStringsMixin],
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
      ...mapMutations('manageContent/wizard', {
        setAvailableChannels: 'SET_AVAILABLE_CHANNELS',
      }),
      submitForm() {
        this.tokenLookupFailed = false;
        this.formIsSubmitted = true;
        if (this.tokenIsValid) {
          this.formIsDisabled = true;
          return this.lookupToken(this.token)
            .then(channels => {
              // tokens can return one or more channels
              if (channels.length > 1) {
                this.setAvailableChannels(channels);
                this.$emit('cancel');
              } else {
                this.$emit('submit', channels[0]);
              }
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
        return getRemoteChannelBundleByToken(token);
      },
    },
    $trs: {
      channelTokenLabel: 'Channel token',
      enterChannelToken: 'Enter channel token',
      invalidTokenMessage: 'Check whether you entered token correctly',
      networkErrorMessage: 'Unable to connect to token',
      tokenExplanation: 'Channel tokens unlock unlisted channels from Kolibri Studio',
    },
  };

</script>


<style lang="scss" scoped></style>
