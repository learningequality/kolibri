<template>

  <core-modal
    title="Import Channel from the Internet"
    :error="wizardState.error"
    :enablebgclickcancel="false"
    :disableclose="wizardState.busy"
    :enablebackbtn="true"
    @cancel="cancel"
    @enter="submit"
    @back="startImportWizard"
  >
    <div>
      <p>Please enter a content channel ID:</p>
      <div>
        <input v-model="contentId" :disabled="wizardState.busy">
      </div>
      <button @click="cancel" :disabled="wizardState.busy">
        Cancel
      </button>
      <button @click="submit" :disabled="!canSubmit">
        Import
      </button>
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


<style lang="stylus" scoped></style>
