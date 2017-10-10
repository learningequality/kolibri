<template>

  <core-modal :title="$tr('title')" @cancel="cancel">
    <div class="main">
      <div class="lg-button-wrapper">
        <k-button
          :text="$tr('internet')"
          @click="goForward('network')"/>
        <k-button
          :text="$tr('localDrives')"
          @click="goForward('local')"/>
      </div>
      <k-button
        @click="cancel"
        appearance="flat-button"
        :text="$tr('cancel')"/>
    </div>
  </core-modal>

</template>


<script>

  import { transitionWizardPage } from '../../../state/actions/contentWizardActions';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'wizardImportSource',
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
      },
    },
    components: {
      coreModal,
      kButton,
    },
    vuex: {
      actions: { transitionWizardPage },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .main
    text-align: center
    margin-bottom: 4em 0

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
