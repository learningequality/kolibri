<template>

  <core-modal
    :title="$tr('title')"
    :error="wizardState.error"
    :enableBgClickCancel="false"
    :enableBackBtn="true"
    @cancel="cancel()"
    @enter="submit()"
    @back="goBack()"
  >
    <div class="main">
      <core-textbox
        :disabled="wizardState.busy"
        :label="$tr('enterContentChannel')"
        :placeholder="$tr('enterContentChannelPlaceholder')"
        v-model="contentId"
      />
    </div>
    <div class="core-text-alert">
      {{ wizardState.error }}
    </div>
    <div class="Buttons">
      <ui-button
        type="secondary"
        name="back"
        @click="goBack()"
        :disabled="wizardState.busy"
      >
        {{ $tr('back') }}
      </ui-button>
      <ui-button
        name="next"
        type="primary"
        color="primary"
        @click="submit()"
        :disabled="!canSubmit"
      >
        {{ $tr('continue') }}
      </ui-button>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../state/actions');

  module.exports = {
    $trNameSpace: 'wizardImportNetwork',
    $trs: {
      title: 'Enter a channel ID',
      enterContentChannel: 'Please enter a content channel ID:',
      enterContentChannelPlaceholder: 'Channel ID',
      back: 'Back',
      continue: 'Continue',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    data: () => ({
      contentId: '',
    }),
    computed: {
      canSubmit() {
        return !(this.wizardState.busy || this.contentId.trim() === '');
      },
    },
    methods: {
      submit() {
        if (this.canSubmit) {
          this.showNetworkImportPreview(this.contentId);
        }
      },
      cancel() {
        this.cancelImportExportWizard();
      },
      goBack() {
        this.startImportWizard();
      }
    },
    vuex: {
      getters: {
        wizardState: (state) => state.pageState.wizardState,
      },
      actions: {
        cancelImportExportWizard: actions.cancelImportExportWizard,
        startImportWizard: actions.startImportWizard,
        showNetworkImportPreview: actions.showNetworkImportPreview,
        triggerRemoteContentImportTask: actions.triggerRemoteContentImportTask,
      },
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

  .Buttons
    text-align: right

  .core-text-alert
    text-align: center

</style>
