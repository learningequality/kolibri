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
      <core-textbox :label="$tr('enterContentChannel')" v-model="channelId" :disabled="wizardState.busy"/>
    </div>
    <div class="core-text-alert">
      {{ wizardState.error }}
    </div>
    <div class="button-wrapper">
      <icon-button
        @click="cancel"
        :text="$tr('cancel')"
        :disabled="wizardState.busy"/>
      <icon-button
        :text="$tr('import')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  import * as manageContentActions from '../../state/manageContentActions';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import coreTextbox from 'kolibri.coreVue.components.textbox';
  export default {
    $trNameSpace: 'wizardImportNetwork',
    $trs: {
      title: 'Please choose a source...',
      enterContentChannel: 'Please enter a content channel ID:',
      cancel: 'Cancel',
      import: 'Import',
    },
    components: {
      coreModal,
      iconButton,
      coreTextbox,
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
      actions: { transitionWizardPage: manageContentActions.transitionWizardPage },
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
