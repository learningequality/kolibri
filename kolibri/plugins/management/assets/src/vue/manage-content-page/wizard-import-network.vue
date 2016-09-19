<template>

  <core-modal
    title="Import from the Internet"
    :error="wizardState.error"
    :enablebgclickcancel="false"
    :disableclose="wizardState.busy"
    :enablebackbtn="true"
    @cancel="cancel"
    @enter="submit"
    @back="startImportWizard"
  >
    <div class="main">
      <h2>Please enter a content channel ID:</h2>
      <div>
        <input v-model="contentId" :disabled="wizardState.busy">
      </div>
    </div>
    <div class="button-wrapper">
      <button @click="cancel" :disabled="wizardState.busy">
        Cancel
      </button>
      <icon-button
        text="Import"
        @click="submit"
        :disabled="!canSubmit"
        :primary="false" >
      </icon-button>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'core-modal': require('kolibri/coreVue/components/coreModal'),
      'icon-button': require('kolibri/coreVue/components/iconButton'),
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
        this.triggerRemoteContentImportTask(this.contentId);
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

  @require '~core-theme.styl'

  .main
    text-align: center
    margin: 4em 0

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

</style>
