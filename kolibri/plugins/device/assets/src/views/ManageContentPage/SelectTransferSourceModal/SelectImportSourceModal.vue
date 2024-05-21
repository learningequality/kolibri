<template>

  <SelectSourceModal
    :submitDisabled="formIsDisabled"
    :showLoadingMessage="formIsDisabled && !initialDelay"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <KRadioButton
      v-model="source"
      :label="$tr('network')"
      :buttonValue="ContentSources.KOLIBRI_STUDIO"
      :disabled="kolibriStudioIsOffline || formIsDisabled"
      :autofocus="!kolibriStudioIsOffline"
      :description="$tr('studioDescription')"
    />
    <KRadioButton
      v-model="source"
      :label="$tr('localNetworkOrInternet')"
      :buttonValue="ContentSources.PEER_KOLIBRI_SERVER"
      :disabled="formIsDisabled"
      :description="$tr('networkDescription')"
    />
    <KRadioButton
      v-model="source"
      :label="$tr('localDrives')"
      :buttonValue="ContentSources.LOCAL_DRIVE"
      :disabled="formIsDisabled"
      :description="$tr('localDescription')"
    />
    <KRadioButton
      v-model="source"
      :label="$tr('newCustomChannel')"
      :buttonValue="ContentSources.NEW_CUSTOM_CHANNEL"
      :disabled="formIsDisabled"
      :description="$tr('newCustomChannelDescription')"
    />
  </SelectSourceModal>

</template>


<script>

  import { mapActions, mapMutations } from 'vuex';
  import { RemoteChannelResource } from 'kolibri.resources';
  import { SelectSourceModal } from 'kolibri.coreVue.componentSets.sync';
  import { ContentSources } from '../../../constants';

  export default {
    name: 'SelectImportSourceModal',
    components: {
      SelectSourceModal,
    },
    data() {
      return {
        source: ContentSources.KOLIBRI_STUDIO,
        initialDelay: true, // hide everything for a second to prevent flicker
        formIsDisabled: true,
        kolibriStudioIsOffline: false,
        ContentSources,
      };
    },
    created() {
      setTimeout(() => {
        this.initialDelay = false;
      }, 1000);
      RemoteChannelResource.getKolibriStudioStatus().then(({ data }) => {
        if (data.status === 'offline') {
          this.source = ContentSources.PEER_KOLIBRI_SERVER;
          this.kolibriStudioIsOffline = true;
        }
        this.formIsDisabled = false;
      });
    },
    methods: {
      ...mapActions('manageContent/wizard', ['goForwardFromSelectImportSourceModal']),
      ...mapMutations('manageContent/wizard', {
        resetContentWizardState: 'RESET_STATE',
      }),
      handleSubmit() {
        if (!this.formIsDisabled) {
          if (this.$attrs.manageMode) {
            this.$emit('submit', { source: this.source });
          } else {
            this.goForwardFromSelectImportSourceModal(this.source);
          }
        }
      },
      handleCancel() {
        if (this.$attrs.manageMode) {
          this.$emit('cancel');
        } else {
          this.resetContentWizardState();
        }
      },
    },
    $trs: {
      network: {
        message: 'Kolibri Studio (online)',
        context: 'Refers to a source where resources can be imported from.\n',
      },
      localNetworkOrInternet: {
        message: 'Local network or internet',
        context: 'Refers to a source where resources can be imported from.',
      },
      localDrives: {
        message: 'Attached drive or memory card',
        context: 'Refers to a source where resources can be imported from.',
      },
      newCustomChannel: {
        message: 'New custom channel',
        context: 'Refers to the creation of a new source where resources can be imported from.',
      },
      studioDescription: {
        message: 'Import resources from Kolibri Studio if you are connected to the internet',
        context: 'Description referring to importing channels from Kolibri Studio.',
      },
      networkDescription: {
        message:
          'Import resources from another Kolibri server running on a device on your local network or the internet',
        context:
          'Description referring to importing channels from a local network or the internet.',
      },
      localDescription: {
        message:
          'Import resources from a drive. Channels must have first been exported onto the drive from another Kolibri server',
        context:
          'Description referring to importing channels from an attached drive or memory card.',
      },
      newCustomChannelDescription: {
        message:
          'Create a custom channel to import your resources directly to this server, without uploading it to Kolibri Studio.',
        context:
          'Description referring to creating a new offline-only channel for importing custom content.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
