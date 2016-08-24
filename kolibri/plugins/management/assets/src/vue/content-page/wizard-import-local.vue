<template>

  <modal title="Import Channel from a Local Drive" @cancel="cancelImportExportWizard">
    <div slot="body">
      <p>Please select a drive to import from:</p>
      <select>
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
      </select>
    </div>
    <div slot="buttons">
      <button @click="cancelImportExportWizard">
        Cancel
      </button>
      <button>
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
    vuex: {
      actions: {
        cancelImportExportWizard: actions.cancelImportExportWizard,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
