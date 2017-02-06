<template>

  <core-modal
    :title="$tr('title')"
    @cancel="cancelImportExportWizard"
  >
    <div class="main">
      <div class="lg-button-wrapper">
        <icon-button class="large-icon-button" :text="$tr('internet')" :showTextBelowIcon="true" @click="showImportNetworkWizard">
          <svg class="icon" src="./world.svg"/>
        </icon-button>
        <icon-button class="large-icon-button" :text="$tr('localDrives')" :showTextBelowIcon="true" @click="showImportLocalWizard">
          <svg class="icon" src="./storage.svg"/>
        </icon-button>
      </div>
      <icon-button
        @click="cancelImportExportWizard"
        :text="$tr('cancel')"/>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    $trNameSpace: 'wizard-import-source',
    $trs: {
      title: 'Please choose a source...',
      internet: 'Internet',
      localDrives: 'Local Drives',
      cancel: 'Cancel',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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

  @require '~kolibri.styles.coreTheme'

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

  .icon
    width: 50px
    height: 50px

</style>
