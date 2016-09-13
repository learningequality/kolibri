<template>

  <core-modal
    title="Please choose a source..."
    :enablebgclickcancel="false"
    @cancel="cancelImportExportWizard"
  >
    <div>
      <div class="main">
        <div class="button-wrapper">
        <icon-button text="Internet" @click="showImportNetworkWizard">
          <svg src="./world.svg"></svg>
        </icon-button>
        <icon-button text="Local Drives" @click="showImportLocalWizard">
          <svg src="./storage.svg"></svg>
        </icon-button>
        </div>
      </div>
      <div class="buttons">
        <button class="text-only-buttons" @click="cancelImportExportWizard">
          Cancel
        </button>
      </div>
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
    vuex: {
      actions: {
        showImportNetworkWizard: actions.showImportNetworkWizard,
        showImportLocalWizard: actions.showImportLocalWizard,
        cancelImportExportWizard: actions.cancelImportExportWizard,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .main
    text-align: center

  .buttons
    margin-top: 1em
    text-align: center

  .text-only-buttons
    height: 36px
    padding-right: 2em
    padding-left: 2em
    margin: 1em
    color: $core-text-annotation
    border: 1px $core-text-annotation solid

</style>
