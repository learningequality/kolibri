<template>

  <KModal
    :title="$tr('selectLocalRemoteSourceTitle')"
    size="medium"
    :submitText="$tr('continue')"
    :cancelText="$tr('cancel')"
    :submitDisabled="formIsDisabled"
    @submit="goForward"
    @cancel="resetContentWizardState"
  >
    <div>
      <KRadioButton
        :label="$tr('network')"
        v-model="source"
        :value="ContentSources.KOLIBRI_STUDIO"
        :disabled="formIsDisabled || kolibriStudioIsOffline"
        :autofocus="!kolibriStudioIsOffline"
      />
      <KRadioButton
        :label="$tr('localNetworkOrInternet')"
        v-model="source"
        :value="ContentSources.PEER_KOLIBRI_SERVER"
        :disabled="formIsDisabled"
      />
      <KRadioButton
        :label="$tr('localDrives')"
        v-model="source"
        :value="ContentSources.LOCAL_DRIVE"
        :disabled="formIsDisabled"
      />
    </div>
  </KModal>

</template>


<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import { RemoteChannelResource } from 'kolibri.resources';
  import KModal from 'kolibri.coreVue.components.KModal';
  import { ContentSources } from '../../../constants';

  export default {
    name: 'SelectImportSourceModal',
    components: {
      KRadioButton,
      KModal,
    },
    data() {
      return {
        source: ContentSources.KOLIBRI_STUDIO,
        formIsDisabled: true,
        kolibriStudioIsOffline: false,
        ContentSources,
      };
    },
    computed: {
      ...mapGetters('manageContent/wizard', ['isImportingMore']),
    },
    created() {
      RemoteChannelResource.getKolibriStudioStatus().then(({ entity }) => {
        if (entity.status === 'offline') {
          this.source = ContentSources.PEER_KOLIBRI_SERVER;
          this.kolibriStudioIsOffline = true;
        }
        this.formIsDisabled = false;
      });
    },
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      network: 'Kolibri Studio (online)',
      localNetworkOrInternet: 'Local network or internet',
      localDrives: 'Attached drive or memory card',
      selectLocalRemoteSourceTitle: 'Import from',
    },
    methods: {
      ...mapActions('manageContent/wizard', ['goForwardFromSelectImportSourceModal']),
      ...mapMutations('manageContent/wizard', {
        resetContentWizardState: 'RESET_STATE',
      }),
      goForward() {
        if (!this.formIsDisabled) {
          this.goForwardFromSelectImportSourceModal(this.source);
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
