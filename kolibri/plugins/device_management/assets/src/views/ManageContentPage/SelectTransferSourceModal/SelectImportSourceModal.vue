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
      />
      <KRadioButton
        v-model="source"
        :label="$tr('localNetworkOrInternet')"
        :value="ContentSources.PEER_KOLIBRI_SERVER"
        :disabled="formIsDisabled"
      />
      <KRadioButton
        v-model="source"
        :label="$tr('localDrives')"
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
  import UiAlert from 'keen-ui/src/UiAlert';
  import { ContentSources } from '../../../constants';

  export default {
    name: 'SelectImportSourceModal',
    components: {
      KRadioButton,
      KModal,
      UiAlert,
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
    computed: {
      ...mapGetters('manageContent/wizard', ['isImportingMore']),
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
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      network: 'Kolibri Studio (online)',
      localNetworkOrInternet: 'Local network or internet',
      localDrives: 'Attached drive or memory card',
      selectLocalRemoteSourceTitle: 'Select a source',
      loadingMessage: 'Loading connections…',
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
