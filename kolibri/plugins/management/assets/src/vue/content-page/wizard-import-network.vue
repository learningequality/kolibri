<template>

  <modal
    title="Import Channel from the Internet"
    :error="wizardState.error"
    :noclose="wizardState.busy"
    :showback="true"
    @cancel="cancel"
    @submit="submit"
    @back="startImportWizard"
  >
    <div slot="body">
      <p>Please enter a content channel ID:</p>
      <div>
        <input v-model="contentId" :disabled="wizardState.busy">
      </div>
    </div>
    <div slot="buttons">
      <button @click="cancel" :disabled="wizardState.busy">
        Cancel
      </button>
      <button @click="submit" :disabled="wizardState.busy">
        Import
      </button>
    </div>
  </modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'modal': require('./modal'),
      'icon-button': require('kolibri/coreVue/components/iconButton'),
    },
    data: () => ({
      contentId: '',
    }),
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
