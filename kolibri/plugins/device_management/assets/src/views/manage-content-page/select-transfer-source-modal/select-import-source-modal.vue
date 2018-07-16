<template>

  <k-modal
    :title="$tr('selectLocalRemoteSourceTitle')"
    size="small"
    :submitText="$tr('continue')"
    :cancelText="$tr('cancel')"
    :submitDisabled="formIsDisabled"
    @submit="goForward"
    @cancel="resetContentWizardState"
  >
    <div>
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
  </k-modal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import { RemoteChannelResource } from 'kolibri.resources';
  import KModal from 'kolibri.coreVue.components.KModal';
  import { ContentSources } from '../../../constants';

  const { LOCAL_DRIVE, KOLIBRI_STUDIO } = ContentSources;

  export default {
    name: 'SelectImportSourceModal',
    components: {
      KRadioButton,
      KModal,
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
      ...mapActions(['goForwardFromSelectImportSourceModal', 'resetContentWizardState']),
      goForward() {
        if (!this.formIsDisabled) {
          this.goForwardFromSelectImportSourceModal(this.source);
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
