<template>

  <core-modal
    :title="$tr('title')"
    :error="wizardState.error"
    :enableBgClickCancel="false"
    :enableBackBtn="true"
    @cancel="cancel"
    @enter="submit"
    @back="startImportWizard"
  >
    <div class="main">
      <h2 class="label">{{$tr('enterContentChannel')}}</h2>
      <div>
        <input v-model="contentId" :disabled="wizardState.busy">
      </div>
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

  const actions = require('../../actions');

  module.exports = {
    $trNamespace: 'wizard-import-network',
    $trs: {
      title: 'Please choose a source...',
      enterContentChannel: 'Please enter a content channel ID:',
      cancel: 'Cancel',
      import: 'Import',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    data: () => ({
      contentId: '',
    }),
    computed: {
      canSubmit() {
        if (this.wizardState.busy) {
          return false;
        }
        return Boolean(this.contentId);
      },
    },
    methods: {
      submit() {
        if (this.canSubmit) {
          this.triggerRemoteContentImportTask(this.contentId);
        }
      },
      cancel() {
        this.cancelImportExportWizard();
      },
    },
    vuex: {
      getters: {
        wizardState: (state) => state.pageState.wizardState,
      },
      actions: {
        startImportWizard: actions.startImportWizard,
        triggerRemoteContentImportTask: actions.triggerRemoteContentImportTask,
        cancelImportExportWizard: actions.cancelImportExportWizard,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .main
    text-align: center
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
