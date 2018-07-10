<template>

  <k-modal
    :title="$tr('selectLocalRemoteSourceTitle')"
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
  </k-modal>

</template>


<script>

  import { mapActions } from 'vuex';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { RemoteChannelResource } from 'kolibri.resources';
  import kModal from 'kolibri.coreVue.components.kModal';
  import { ContentSources } from '../../../constants';

  const { LOCAL_DRIVE, KOLIBRI_STUDIO } = ContentSources;

  export default {
    name: 'selectImportSourceModal',
    components: {
      kRadioButton,
      kModal,
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


<style lang="scss" scoped>

  .options {
    margin: 2em 0;
  }

</style>
