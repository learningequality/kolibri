<template>

  <core-modal
    :title="modalTitle"
    :enableBgClickCancel="false"
    @cancel="cancel"
    @enter="submit"
    :enableBackBtn="true"
    @back="goBack"
  >
    <div>

      <!-- LOCAL IMPORT PREVIEW -->
      <div v-if="importSource === 'local'">
        <p>{{ localImportPrompt }}</p>

        <ul class="channel-list">
          <li v-for="(channel, i) in channelList" :key="i" >
            {{ channel.name }}
            <span v-if="coreChannel(channel.id)" class="already-installed">
              ({{ $tr('channelAlreadyInstalled') }})
            </span>
          </li>
        </ul>
      </div>

      <!-- REMOTE IMPORT PREVIEW -->
      <div v-if="importSource === 'remote'">
        <p>{{ $tr('remoteImportPrompt') }}</p>

        <p v-if="coreChannel(sourceMeta.channelId)">
          {{ coreChannel(sourceMeta.channelId).title }}
          <span class="already-installed">
            ({{ $tr('channelAlreadyInstalled') }})
          </span>
        </p>
        <p v-else>
          {{ sourceMeta.channelId }}
        </p>
      </div>

      <div v-if="error" class="error">
        {{ error }}
      </div>

      <div class="button-wrapper">
        <k-button @click="cancel" :text="$tr('cancelButtonLabel')" />
        <k-button
          v-show="!error"
          :text="$tr('confirmButtonLabel')"
          @click="submit"
          :primary="true"
        />
      </div>
    </div>

  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { transitionWizardPage } from '../../../state/actions/contentWizardActions';
  import find from 'lodash/find';

  export default {
    name: 'previewImportWizard',
    components: {
      coreModal,
      kButton,
    },
    computed: {
      modalTitle() {
        if (this.importSource === 'local') {
          return this.$tr('localImportTitle');
        } else {
          return this.$tr('remoteImportTitle');
        }
      },
      localImportPrompt() {
        return this.$tr('localImportPrompt', {
          numChannels: this.channelList.length,
          driveName: this.sourceMeta.driveName,
        });
      },
      importSource() {
        if (this.sourceMeta.driveId !== undefined) {
          return 'local';
        }
        return 'remote';
      },
      channelList() {
        return this.sourceMeta.channelList;
      },
      sourceId() {
        if (this.importSource === 'local') {
          return this.sourceMeta.driveId;
        } else {
          return this.sourceMeta.channelId;
        }
      },
    },
    methods: {
      cancel() {
        this.transitionWizardPage('cancel');
      },
      goBack() {
        this.transitionWizardPage('backward');
      },
      submit() {
        return this.transitionWizardPage('forward', { sourceId: this.sourceId });
      },
    },
    vuex: {
      getters: {
        error: state => state.pageState.wizardState.error,
        sourceMeta: state => state.pageState.wizardState.meta,
        coreChannel: state => channelId => {
          return find(state.core.channels.list, { id: channelId });
        },
      },
      actions: {
        transitionWizardPage,
      },
    },
    $trs: {
      cancelButtonLabel: 'Cancel',
      channelAlreadyInstalled: 'Already installed',
      confirmButtonLabel: 'Import',
      localImportPrompt:
        'You are about to import {numChannels, number} {numChannels, plural, one {Channel} other {Channels}} on {driveName}',
      localImportTitle: 'Import from local drive',
      remoteImportPrompt: 'You are about to import 1 channel',
      remoteImportTitle: 'Import from internet',
    },
  };

</script>


<style lang="stylus" scoped>

  .button-wrapper
    margin: 1em 0
    text-align: center

  .channel-list
    list-style: none
    padding-left: 0

  .channel-list li
    margin: 1rem 0

  .already-installed
    font-weight: bold

  .error
    color: red

</style>
