<template>

  <modal
    title="Export Channel to a Local Drive"
    :error="wizardState.error"
    :noclose="wizardState.busy"
    @cancel="cancel"
    @submit="submit"
  >
    <div slot="body">
      <p>Please select a drive to export to:</p>
      <select>
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
      </select>
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
      'icon-button': require('icon-button'),
    },
    methods: {
      submit() {
      },
      cancel() {
        if (!this.wizardState.busy) {
          this.cancelImportExportWizard();
        }
      },
    },
    vuex: {
      getters: {
        wizardState: (state) => state.pageState.wizardState,
      },
      actions: {
        cancelImportExportWizard: actions.cancelImportExportWizard,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
