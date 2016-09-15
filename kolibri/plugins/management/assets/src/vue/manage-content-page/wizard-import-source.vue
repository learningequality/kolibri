<template>

  <core-modal
    title="Please choose a source..."
    :enablebgclickcancel="false"
    @cancel="cancelImportExportWizard"
  >
    <div class="main">
      <div class="button-wrapper">
        <icon-button class="large-icon-button" bottomtext="Internet" @click="showImportNetworkWizard">
          <svg height="50" width="50" src="./world.svg"></svg>
        </icon-button>
        <icon-button class="large-icon-button" bottomtext="Local Drives" @click="showImportLocalWizard">
          <svg height="50" width="50" src="./storage.svg"></svg>
        </icon-button>
      </div>
      <button class="button-cancel" @click="cancelImportExportWizard">
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


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .main
    text-align: center
    margin-bottom: 2em

  .large-icon-button
    width: 140px
    height: 120px
    margin: 0.6em

  .button-wrapper
    margin: 2em 0

</style>
