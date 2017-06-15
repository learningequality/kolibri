<template>

  <core-modal :title="$tr('title')" @cancel="cancel">
    <div class="main">
      <div class="lg-button-wrapper">
        <icon-button
          class="large-icon-button"
          :text="$tr('internet')"
          :showTextBelowIcon="true"
          @click="goForward('network')"
        >
          <mat-svg class="icon" category="action" name="language"/>
        </icon-button>
        <icon-button
          class="large-icon-button"
          :text="$tr('localDrives')"
          :showTextBelowIcon="true"
          @click="goForward('local')"
        >
          <mat-svg class="icon" category="device" name="storage"/>
        </icon-button>
      </div>
      <icon-button
        @click="cancel"
        :text="$tr('cancel')"/>
    </div>
  </core-modal>

</template>


<script>

  const manageContentActions = require('../../state/manageContentActions');

  module.exports = {
    $trNameSpace: 'wizardImportSource',
    $trs: {
      title: 'Please choose a source...',
      internet: 'Internet',
      localDrives: 'Local Drives',
      cancel: 'Cancel',
    },
    methods: {
      goForward(source) {
        return this.transitionWizardPage('forward', { source });
      },
      cancel() {
        return this.transitionWizardPage('cancel');
      }
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    vuex: {
      actions: {
        transitionWizardPage: manageContentActions.transitionWizardPage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .main
    text-align: center
    margin-bottom: 4em 0

  .large-icon-button
    min-width: 150px
    min-height: 120px
    margin: 3px

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
