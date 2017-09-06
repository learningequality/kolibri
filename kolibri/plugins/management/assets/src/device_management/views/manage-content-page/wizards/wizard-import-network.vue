<template>

  <core-modal
    :title="$tr('title')"
    :error="wizardState.error"
    :enableBgClickCancel="false"
    :enableBackBtn="true"
    @cancel="cancel"
    @enter="submit"
    @back="goBack"
  >
    <form @submit.prevent="submit">
      <div class="main">
        <k-textbox
          ref="textbox"
          :label="$tr('enterContentChannel')"
          v-model.trim="channelId"
          :disabled="formIsDisabled"
          :invalid="channelIdIsInvalid"
          :invalidText="$tr('channelIdIsInvalid')"
          @blur="channelIdBlurred=true"
        />
      </div>
      <div class="core-text-alert">
        {{ wizardState.error }}
      </div>
      <div class="button-wrapper">
        <k-button
          @click="cancel"
          :text="$tr('cancel')"
          type="button"
          :raised="false"
          :disabled="formIsDisabled"/>
        <k-button
          :text="$tr('import')"
          type="submit"
          :disabled="formIsDisabled"
          :primary="true"/>
      </div>
    </form>
  </core-modal>

</template>


<script>

  import { transitionWizardPage } from '../../../state/actions/contentWizardActions';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  export default {
    name: 'wizardImportNetwork',
    $trs: {
      title: 'Import from the internet',
      enterContentChannel: 'Content channel ID',
      cancel: 'Cancel',
      import: 'Import',
      channelIdIsInvalid: 'Content Channel ID cannot be blank',
    },
    components: {
      coreModal,
      kButton,
      kTextbox,
    },
    data: () => ({
      channelId: '',
      channelIdBlurred: false,
    }),
    computed: {
      channelIdIsInvalid() {
        return this.channelIdBlurred && !this.formIsValid;
      },
      formIsDisabled() {
        return this.wizardState.busy;
      },
      formIsValid() {
        return this.channelId !== '';
      },
    },
    methods: {
      goBack() {
        this.transitionWizardPage('backward');
      },
      submit() {
        if (this.formIsValid) {
          this.transitionWizardPage('forward', { channelId: this.channelId });
        } else {
          this.channelIdBlurred = true;
          this.$refs.textbox.focus();
        }
      },
      cancel() {
        this.transitionWizardPage('cancel');
      },
    },
    vuex: {
      getters: { wizardState: state => state.pageState.wizardState },
      actions: { transitionWizardPage },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .main
    margin: 3em 0

  h2
    font-size: 1em

  input
    margin: 1em 0
    padding: 0.6em 0.8em
    border: 2px solid $core-action-normal
    border-radius: 4px

  .button-wrapper
    margin: 1em 0
    text-align: center

  button
    margin: 0.4em

  .core-text-alert
    text-align: center

</style>
