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
    <div class="main">
      <k-textbox :label="$tr('enterContentChannel')" v-model="channelId" :disabled="wizardState.busy"/>
    </div>
    <div class="core-text-alert">
      {{ wizardState.error }}
    </div>
    <div class="button-wrapper">
      <k-button
        @click="cancel"
        :text="$tr('cancel')"
        :raised="false"
        :disabled="wizardState.busy"/>
      <k-button
        :text="$tr('import')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  import * as contentWizardActions from '../../../state/actions/contentWizardActions'
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
    },
    components: {
      coreModal,
      kButton,
      kTextbox,
    },
    data: () => ({ channelId: '' }),
    computed: {
      canSubmit() {
        if (this.wizardState.busy) {
          return false;
        }
        return Boolean(this.channelId);
      },
    },
    methods: {
      goBack() {
        this.transitionWizardPage('backward');
      },
      submit() {
        if (this.canSubmit) {
          this.transitionWizardPage('forward', { channelId: this.channelId });
        }
      },
      cancel() {
        this.transitionWizardPage('cancel');
      },
    },
    vuex: {
      getters: { wizardState: state => state.pageState.wizardState },
      actions: { transitionWizardPage: contentWizardActions.transitionWizardPage },
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
