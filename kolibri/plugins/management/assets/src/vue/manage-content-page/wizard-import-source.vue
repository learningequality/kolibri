<template>

  <core-modal
    title="Please choose a source..."
    :enablebgclickcancel="false"
    @cancel="cancelImportExportWizard"
  >
    <div>
      <div class="main">
        <div class="button-wrapper">
          <icon-button class="large-icon-button" bottomtext="Internet" @click="showImportNetworkWizard">
            <svg height="50" width="50" src="./world.svg"></svg>
          </icon-button>
          <icon-button class="large-icon-button" bottomtext="Local Drives" @click="showImportLocalWizard">
            <svg height="50" width="50" src="./storage.svg"></svg>
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

  @require '~core-theme.styl'

  .main
    text-align: center

  .large-icon-button
    width: 140px
    height: 120px
    margin: 0.6em

  .button-wrapper
    margin-top: 2em
    margin-bottom: 1em

  .buttons
    margin: 1em
    text-align: center

  .text-only-buttons
    height: 36px
    padding-right: 2em
    padding-left: 2em
    margin: 1em
    color: $core-text-annotation
    border: 1px $core-text-annotation solid

</style>
