<template>

  <SelectSourceModal
    :submitDisabled="formIsDisabled"
    :showLoadingMessage="formIsDisabled && !initialDelay"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <KRadioButtonGroup>
      <KRadioButton
        v-model="source"
        :label="$tr('dataPortalLabel')"
        :buttonValue="SyncSources.PORTAL"
        :disabled="portalIsOffline || formIsDisabled"
        :autofocus="!portalIsOffline"
        :description="$tr('dataPortalDescription')"
      />
      <KRadioButton
        v-model="source"
        :label="$tr('localNetworkLabel')"
        :buttonValue="SyncSources.PEER"
        :disabled="formIsDisabled"
        :description="$tr('localNetworkDescription')"
      />
    </KRadioButtonGroup>
  </SelectSourceModal>

</template>


<script>

  import SelectSourceModal from './SelectSourceModal';

  const SyncSources = Object.freeze({
    PORTAL: 'PORTAL',
    PEER: 'PEER',
  });

  export default {
    name: 'SelectSyncSourceModal',
    components: {
      SelectSourceModal,
    },
    data() {
      return {
        source: SyncSources.PORTAL,
        initialDelay: true, // hide everything for a second to prevent flicker
        formIsDisabled: true,
        portalIsOffline: false,
        SyncSources,
      };
    },
    created() {
      setTimeout(() => {
        this.initialDelay = false;
      }, 1000);
      // TODO Check to see if KDP is online
      Promise.resolve().then(() => {
        this.portalIsOffline = false;
        this.formIsDisabled = false;
      });
    },
    methods: {
      handleSubmit() {
        if (!this.formIsDisabled) {
          this.$emit('submit', { source: this.source });
        }
      },
      handleCancel() {
        this.$emit('cancel');
      },
    },
    $trs: {
      dataPortalLabel: {
        message: 'Kolibri Data Portal (online)',
        context:
          'Label on radio button for Kolibri Data Portal, which requires an internet connection',
      },
      dataPortalDescription: {
        message: 'Sync to Kolibri Data Portal if your facility is registered',
        context: 'Description of the sync option',
      },
      localNetworkLabel: {
        message: 'Local network or internet',
        context: 'Label on radio button for Local or Internet',
      },
      localNetworkDescription: {
        message:
          'Sync facility data with another Kolibri server on your local network or the internet',

        context: 'Description of the sync option.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
