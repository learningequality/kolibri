<template>

  <modal title="Please choose a source..." @cancel="cancelImportExportWizard">
    <div slot="body">
      <icon-button text="Internet" @click="showImportNetworkWizard">
        <svg src="./world.svg"></svg>
      </icon-button>
      <icon-button text="Local Drives" @click="showImportLocalWizard">
        <svg src="./storage.svg"></svg>
      </icon-button>
    </div>
    <div slot="buttons">
      <button @click="cancelImportExportWizard">
        Cancel
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
