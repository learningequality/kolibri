<template>

  <core-modal
    :title="$tr('title')"
    @enter="goForward"
    @cancel="cancel"
  >
    <div class="options">
      <k-radio-button
        :label="$tr('network')"
        v-model="source"
        value="network"
        :disabled="disableUi || kolibriStudioIsOffline"
        :autofocus="!kolibriStudioIsOffline"
      />
      <k-radio-button
        :label="$tr('localDrives')"
        v-model="source"
        value="local"
        :disabled="disableUi"
      />
    </div>

    <div class="core-modal-buttons">
      <k-button
        @click="cancel"
        appearance="flat-button"
        :text="$tr('cancel')"
      />
      <k-button
        @click="goForward"
        :primary="true"
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
  import { RemoteChannelResource } from 'kolibri.resources';
  import {
    transitionWizardPage,
    FORWARD,
    CANCEL,
    LOCAL_DRIVE,
    KOLIBRI_STUDIO,
  } from '../../../state/actions/contentWizardActions';

  export default {
    name: 'selectImportSourceModal',
    components: {
      coreModal,
      kButton,
      kRadioButton,
    },
    data() {
      return {
        source: KOLIBRI_STUDIO,
        disableUi: true,
        kolibriStudioIsOffline: false,
      };
    },
    created() {
      RemoteChannelResource.getKolibriStudioStatus().then(({ entity }) => {
        if (entity.status === 'offline') {
          this.source = LOCAL_DRIVE;
          this.kolibriStudioIsOffline = true;
        }
        this.disableUi = false;
      });
    },
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      network: 'Kolibri Studio',
      localDrives: 'Attached drive or memory card',
      title: 'Import from',
    },
    methods: {
      goForward() {
        return this.transitionWizardPage(FORWARD, { source: this.source });
      },
      cancel() {
        return this.transitionWizardPage(CANCEL);
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

</style>
