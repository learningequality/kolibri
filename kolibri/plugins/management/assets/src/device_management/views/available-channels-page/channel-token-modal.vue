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
        autofocus
        @blur="tokenIsBlurred=true"
        :disabled="formIsDisabled"
      />

      <div class="buttons">
        <k-button
          :text="$tr('cancel')"
          name="cancel"
          appearance="flat-button"
          @click="$emit('closemodal')"
          :disabled="formIsDisabled"
        />
        <k-button
          class="submit"
          type="submit"
          :text="$tr('confirm')"
          :primary="true"
          :disabled="formIsDisabled"
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
  import { getRemoteChannelByToken } from '../../state/actions/availableChannelsActions';

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
      confirm: 'Confirm',
      enterChannelToken: 'Enter channel token',
      invalidTokenMessage: 'Check whether you entered token correctly',
      networkErrorMessage: 'Unable to connect to token',
      tokenExplanation: 'Channel tokens unlock unlisted channels from Kolibri Studio',
    },
  };

</script>


<style lang="stylus" scoped>

  .buttons
    text-align: right

  .submit
    margin-right: 0

</style>
