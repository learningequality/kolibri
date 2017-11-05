<template>

  <core-modal :title="$tr('title')" hideTopButtons>
    <div>
      <div class="options">
        <k-radio-button
          :label="$tr('network')"
          v-model="source"
          radiovalue="network"
          autofocus
        />
        <k-radio-button
          :label="$tr('localDrives')"
          v-model="source"
          radiovalue="local"
        />
      </div>

      <div class="buttons">
        <k-button @click="cancel" appearance="flat-button" :text="$tr('cancel')" />
        <k-button @click="goForward" primary :text="$tr('continue')" />
      </div>
    </div>
  </core-modal>

</template>


<script>

  import { transitionWizardPage } from '../../../state/actions/contentWizardActions';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'wizardImportSource',
    components: {
      coreModal,
      kButton,
      kRadioButton,
    },
    data() {
      return {
        source: 'network',
      };
    },
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      network: 'Kolibri Central Server',
      localDrives: 'Attached drive or memory card',
      title: 'Import from where?',
    },
    methods: {
      goForward() {
        return this.transitionWizardPage('forward', { source: this.source });
      },
      cancel() {
        return this.transitionWizardPage('cancel');
      },
    },
    vuex: {
      actions: {
        transitionWizardPage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .options
    margin: 2em 0

  .buttons
    text-align: right
    button:nth-child(2)
      margin-right: 0

</style>
