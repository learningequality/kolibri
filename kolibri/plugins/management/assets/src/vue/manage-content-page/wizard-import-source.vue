<template>

  <core-modal
    title="Please choose a source..."
    :enablebgclickcancel="false"
    @cancel="cancelImportExportWizard"
  >
    <div>
      <icon-button text="Internet" @click="showImportNetworkWizard">
        <svg src="./world.svg"></svg>
      </icon-button>
      <icon-button text="Local Drives" @click="showImportLocalWizard">
        <svg src="./storage.svg"></svg>
      </icon-button>
      <button @click="cancelImportExportWizard">
        Cancel
      </button>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
    },
    vuex: {
      actions: {
        showImportNetworkWizard: actions.showImportNetworkWizard,
        showImportLocalWizard: actions.showImportLocalWizard,
        cancelImportExportWizard: actions.cancelImportExportWizard,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
