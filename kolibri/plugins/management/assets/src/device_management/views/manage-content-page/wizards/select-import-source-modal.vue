<template>

  <core-modal
    :title="$tr('title')"
    hideTopButtons
    @enter="goForward"
    @cancel="cancel"
  >
    <div class="options">
      <k-radio-button
        :label="$tr('network')"
        v-model="source"
        radiovalue="network"
        :disabled="disableUi || kolibriStudioIsOffline"
        :autofocus="!kolibriStudioIsOffline"
      />
      <k-radio-button
        :label="$tr('localDrives')"
        v-model="source"
        radiovalue="local"
        :disabled="disableUi"
      />
    </div>

    <div class="buttons">
      <k-button
        @click="cancel"
        appearance="flat-button"
        :text="$tr('cancel')"
      />
      <k-button
        @click="goForward"
        primary
        :disabled="disableUi"
        :text="$tr('continue')"
      />
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { transitionWizardPage } from '../../../state/actions/contentWizardActions';
  import { RemoteChannelResource } from 'kolibri.resources';

  export default {
    name: 'selectImportSourceModal',
    components: {
      coreModal,
      kButton,
      kRadioButton,
    },
    data() {
      return {
        source: 'network',
        disableUi: true,
        kolibriStudioIsOffline: false,
      };
    },
    created() {
      RemoteChannelResource.getKolibriStudioStatus().then(({ entity }) => {
        if (entity.status === 'offline') {
          this.source = 'local';
          this.kolibriStudioIsOffline = true;
        }
        this.disableUi = false;
      });
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
