<template>

  <core-modal
    :title="$tr('selectLocalRemoteSourceTitle')"
    :enableBgClickCancel="false"
    :submitText="$tr('continue')"
    :cancelText="$tr('cancel')"
    :submitDisabled="formIsDisabled"
    @submit="goForward"
    @cancel="resetContentWizardState"
  >
    <div class="options">
      <k-radio-button
        :label="$tr('network')"
        v-model="source"
        value="network"
        :disabled="formIsDisabled || kolibriStudioIsOffline"
        :autofocus="!kolibriStudioIsOffline"
      />
      <k-radio-button
        :label="$tr('localDrives')"
        v-model="source"
        value="local"
        :disabled="formIsDisabled"
      />
    </div>
  </core-modal>

</template>


<script>

  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { RemoteChannelResource } from 'kolibri.resources';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import {
    goForwardFromSelectImportSourceModal,
    LOCAL_DRIVE,
    KOLIBRI_STUDIO,
    resetContentWizardState,
  } from '../../../state/actions/contentWizardActions';

  export default {
    name: 'selectImportSourceModal',
    components: {
      kRadioButton,
      coreModal,
    },
    data() {
      return {
        source: KOLIBRI_STUDIO,
        formIsDisabled: true,
        kolibriStudioIsOffline: false,
      };
    },
    created() {
      RemoteChannelResource.getKolibriStudioStatus().then(({ entity }) => {
        if (entity.status === 'offline') {
          this.source = LOCAL_DRIVE;
          this.kolibriStudioIsOffline = true;
        }
        this.formIsDisabled = false;
      });
    },
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      network: 'Kolibri Studio',
      localDrives: 'Attached drive or memory card',
      selectLocalRemoteSourceTitle: 'Import from',
    },
    methods: {
      goForward() {
        if (!this.formIsDisabled) {
          this.goForwardFromSelectImportSourceModal(this.source);
        }
      },
    },
    vuex: {
      actions: {
        goForwardFromSelectImportSourceModal,
        resetContentWizardState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .options
    margin: 2em 0

</style>
