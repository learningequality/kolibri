<template>

  <core-modal
    :title="modalTitle"
    :error="sourceMeta.error"
    :enableBgClickCancel="false"
    :enableBackBtn="true"
    @cancel="cancel()"
    @back="goBack()"
  >
    <div>
      <div v-if="Boolean(sourceMeta.error)" class="content ImportError">
        <p>{{ importErrorPrompt }}</p>
      </div>

      <div v-else-if="contentIsFromNetwork" class="content NetworkImport">
        <p>{{ $tr('networkImportPrompt') }}</p>
        <b>{{ sourceMeta.sourceName }}</b>
      </div>

      <div v-else class="content LocalImport">
        <p>{{ localImportPrompt }}</p>
        <p v-for="channel in sourceMeta.channels">
          <b>{{ channel.name }}</b>
        </p>
      </div>

      <div class="Buttons">
        <ui-button
          @click="goBack()"
          name="go-back"
          type="secondary"
        >
          {{ $tr('back') }}
        </ui-button>
        <ui-button
          :disabled="!canSubmit"
          @click="submit()"
          color="primary"
          name="submit"
          type="primary"
        >
          {{ $tr('startImport') }}
        </ui-button>
      </div>
    </div>

  </core-modal>

</template>


<script>

  const actions = require('../../state/actions');

  const NETWORK = 'network';

  module.exports = {
    components: {
      coreModal: require('kolibri.coreVue.components.coreModal'),
      UiButton: require('keen-ui/src/UiButton'),
    },
    computed: {
      contentIsFromNetwork() {
        return this.sourceMeta.sourceType === NETWORK;
      },
      canSubmit() {
        return this.sourceMeta.error === null;
      },
      modalTitle() {
        if (this.contentIsFromNetwork) {
          return this.$tr('titleNetwork');
        }
        return this.$tr('titleLocal');
      },
      localImportPrompt() {
        return this.$tr('localImportPrompt', {
          numChannels: this.sourceMeta.channels.length,
          driveName: this.sourceMeta.sourceName,
        });
      },
      importErrorPrompt() {
        if (this.contentIsFromNetwork) {
          return this.$tr('networkErrorPrompt');
        }
        return this.$tr('localErrorPrompt');
      },
    },
    methods: {
      cancel() {
        this.cancelImportExportWizard();
      },
      goBack() {
        if (this.contentIsFromNetwork) {
          return this.showImportNetworkWizard();
        }
        return this.startImportWizard();
      },
      submit() {
        if (this.contentIsFromNetwork) {
          return this.triggerRemoteContentImportTask(this.sourceMeta.sourceId);
        }
        return this.triggerLocalContentImportTask(this.sourceMeta.sourceId);
      },
    },
    vuex: {
      getters: {
        sourceMeta: (state) => state.pageState.wizardState.meta,
        wizardState: (state) => state.pageState.wizardState,
      },
      actions: {
        cancelImportExportWizard: actions.cancelImportExportWizard,
        startImportWizard: actions.startImportWizard,
        showImportNetworkWizard: actions.showImportNetworkWizard,
        triggerRemoteContentImportTask: actions.triggerRemoteContentImportTask,
        triggerLocalContentImportTask: actions.triggerLocalContentImportTask,
      },
    },
    $trNameSpace: 'importPreview',
    $trs: {
      back: 'Back',
      localErrorPrompt: 'There was a problem reading this local drive.',
      localImportPrompt: '{numChannels, number} {numChannels, plural, one {Channel} other {Channels}} on {driveName}',
      networkErrorPrompt: 'There was a problem finding this channel. Make sure you have entered a valid Channel ID.',
      networkImportPrompt: 'You are about to import 1 Channel:',
      startImport: 'Start import',
      titleLocal: 'Import from a local drive',
      titleNetwork: 'Import from the internet',
    }
  };

</script>


<style lang="stylus" scoped>

  .content
    margin-bottom: 20px

  .Buttons
    text-align: right

</style>
