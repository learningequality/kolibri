<template>

  <KModal
    :title="$tr('selectLocalRemoteSourceTitle')"
    size="medium"
    :submitText="$tr('continue')"
    :cancelText="coreCommon$tr('cancelAction')"
    :submitDisabled="formIsDisabled"
    @submit="goForward"
    @cancel="resetContentWizardState"
  >
    <UiAlert
      v-if="formIsDisabled && !initialDelay"
      type="info"
      :dismissible="false"
      class="delay"
    >
      {{ $tr('loadingMessage') }}
    </UiAlert>

    <div>
      <KRadioButton
        v-model="source"
        :label="$tr('network')"
        :value="ContentSources.KOLIBRI_STUDIO"
        :disabled="kolibriStudioIsOffline || formIsDisabled"
        :autofocus="!kolibriStudioIsOffline"
        :description="$tr('studioDescription')"
      />
      <KRadioButton
        v-model="source"
        :label="$tr('localNetworkOrInternet')"
        :value="ContentSources.PEER_KOLIBRI_SERVER"
        :disabled="formIsDisabled"
        :description="$tr('networkDescription')"
      />
      <KRadioButton
        v-model="source"
        :label="$tr('localDrives')"
        :value="ContentSources.LOCAL_DRIVE"
        :disabled="formIsDisabled"
        :description="$tr('localDescription')"
      />
    </div>
  </KModal>

</template>


<script>

  import { mapActions, mapMutations } from 'vuex';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import { RemoteChannelResource } from 'kolibri.resources';
  import KModal from 'kolibri.coreVue.components.KModal';
  import UiAlert from 'keen-ui/src/UiAlert';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';
  import { ContentSources } from '../../../constants';

  export default {
    name: 'SelectImportSourceModal',
    components: {
      KRadioButton,
      KModal,
      UiAlert,
    },
    mixins: [coreStringsMixin],
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
      RemoteChannelResource.getKolibriStudioStatus().then(({ entity }) => {
        if (entity.status === 'offline') {
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
      goForward() {
        if (!this.formIsDisabled) {
          this.goForwardFromSelectImportSourceModal(this.source);
        }
      },
    },
    $trs: {
      continue: 'Continue',
      network: 'Kolibri Studio (online)',
      localNetworkOrInternet: 'Local network or internet',
      localDrives: 'Attached drive or memory card',
      selectLocalRemoteSourceTitle: 'Select a source',
      loadingMessage: 'Loading connections…',
      studioDescription:
        "Import content channels from Learning Equality's library if you are connected to the internet",
      networkDescription:
        'Import content channels from Kolibri running on another device, either in the same local network or on the internet',
      localDescription:
        'Import content channels from a drive. Channels must first be exported onto the drive from another Kolibri device with existing content',
    },
  };

</script>


<style lang="scss" scoped></style>
