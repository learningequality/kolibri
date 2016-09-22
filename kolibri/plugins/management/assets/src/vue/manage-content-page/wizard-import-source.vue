<template>

  <core-modal
    title="Please choose a source..."
    :enablebgclickcancel="false"
    @cancel="cancelImportExportWizard"
  >
    <div class="main">
      <div class="lg-button-wrapper">
        <icon-button class="large-icon-button" text="Internet" :bottomtext="true" @click="showImportNetworkWizard">
          <svg height="50" width="50" src="./world.svg"></svg>
        </icon-button>
        <icon-button class="large-icon-button" text="Local Drives" :bottomtext="true" @click="showImportLocalWizard">
          <svg height="50" width="50" src="./storage.svg"></svg>
        </icon-button>
      </div>
      <icon-button
        @click="cancelImportExportWizard"
        text="Cancel">
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

  @require '~kolibri/styles/coreTheme'

  .main
    text-align: center
    margin-bottom: 4em 0

  .large-icon-button
    width: 140px
    height: 120px
    margin: 0.6em

  .lg-button-wrapper
    margin: 4em 0

  .cancel-btn
    margin-bottom: 2em

  .text-only-buttons
    height: 36px
    padding-right: 2em
    padding-left: 2em
    margin: 1em
    color: $core-text-annotation
    border: 1px $core-text-annotation solid

</style>
