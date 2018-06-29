<template>

  <div>
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

    <div class="core-modal-buttons">
      <k-button
        @click="$emit('cancel')"
        appearance="flat-button"
        :text="$tr('cancel')"
      />
      <k-button
        @click="goForward"
        :primary="true"
        :disabled="formIsDisabled"
        :text="$tr('continue')"
      />
    </div>
  </div>

</template>


<script>

  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { RemoteChannelResource } from 'kolibri.resources';
  import {
    goForwardFromSelectImportSourceModal,
    LOCAL_DRIVE,
    KOLIBRI_STUDIO,
  } from '../../../state/actions/contentWizardActions';

  export default {
    name: 'selectImportSourceModal',
    components: {
      kButton,
      kRadioButton,
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
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .options
    margin: 2em 0

</style>
