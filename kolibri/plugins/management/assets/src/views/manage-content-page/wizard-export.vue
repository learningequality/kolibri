<template>

  <core-modal
    :title="$tr('title')"
    :error="wizardState.error ? true : false"
    :enableBgClickCancel="false"
    @cancel="cancel"
    @enter="submit"
  >
    <div class="main">
      <template v-if="!drivesLoading">
        <div class="modal-message">
          <p>
            {{ $tr('exportPromptPrefix', { numChannels: allChannels.length }) }}
            <span id="content-size">{{ exportContentSize }}</span>.
          </p>
          <drive-list
            :value="selectedDrive"
            :drives="wizardState.driveList"
            :enabledDrivePred="isEnabledDrive"
            :enabledMsg="enabledMsg"
            :disabledMsg="$tr('notWritable')"
            @change="(driveId) => selectedDrive = driveId"
          />
        </div>

        <div class="refresh-btn-wrapper">
          <icon-button
            :disabled="wizardState.busy"
            :text="$tr('refresh')"
            @click="updateWizardLocalDriveList"
          >
            <mat-svg category="navigation" name="refresh"/>
          </icon-button>
        </div>
      </template>

      <loading-spinner v-else :delay="500" class="spinner"/>
    </div>
    <div class="core-text-alert">
      {{ wizardState.error }}
    </div>
    <div class="Buttons">
      <ui-button
        type="secondary"
        @click="cancel()"
      >
        {{ $tr('cancel') }}
      </ui-button>
      <ui-button
        name="submit"
        :disabled="!canSubmit"
        :primary="true"
        @click="submit()"
        color="primary"
        type="primary"
      >
        {{ $tr('export') }}
        <span v-if="contentsTotalSize">
          ({{ contentsTotalSize }})
        </span>
      </ui-button>
    </div>
  </core-modal>

</template>


<script>

  const sumBy = require('lodash/sumBy');
  const actions = require('../../state/actions');
  const bytesForHumans = require('./bytesForHumans');

  module.exports = {
    $trNameSpace: 'wizardExport',
    $trs: {
      available: 'available',
      cancel: 'Cancel',
      export: 'Start Export',
      exportPromptContentSize: '{numChannels, number} {numChannels, plural, one {Channel} other {Channels}} ({totalSize})',
      exportPromptPrefix: 'You are about to export {numChannels, number} {numChannels, plural, one {Channel} other {Channels}}',
      notWritable: 'Not writable',
      refresh: 'Refresh',
      title: 'Export to where?',
      waitForTotalSize: 'Calculating total size...',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'drive-list': require('./wizards/drive-list'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'loading-spinner': require('kolibri.coreVue.components.loadingSpinner'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    data: () => ({
      selectedDrive: '', // used when there's more than one option
    }),
    computed: {
      drivesLoading() {
        return this.wizardState.driveList === null;
      },
      canSubmit() {
        return (
          !this.drivesLoading &&
          !this.wizardState.busy &&
          Boolean(this.selectedDrive)
        );
      },
      exportContentSize() {
        return this.contentsTotalSize || this.$tr('waitForTotalSize');
      },
      allChannelsHaveStats() {
        // only checks that lengths are same, not that IDs are same too
        return this.allChannels.length === Object.keys(this.channelsWithStats).length;
      },
      contentsTotalSize() {
        if (this.allChannelsHaveStats) {
          const totalSize = sumBy(Object.values(this.channelsWithStats), 'totalFileSizeInBytes');
          return bytesForHumans(totalSize);
        }
        return '';
      }
    },
    beforeMount() {
      this.updateWizardLocalDriveList();
    },
    methods: {
      enabledMsg(drive) {
        return `${bytesForHumans(drive.freespace)} ${this.$tr('available')}`;
      },
      isEnabledDrive(drive) {
        return drive.writable;
      },
      submit() {
        this.triggerLocalContentExportTask(this.selectedDrive);
      },
      cancel() {
        if (!this.wizardState.busy) {
          this.cancelImportExportWizard();
        }
      },
    },
    vuex: {
      getters: {
        allChannels: (state) => state.core.channels.list,
        channelsWithStats: (state) => state.pageState.channelInfo,
        wizardState: (state) => state.pageState.wizardState,
      },
      actions: {
        cancelImportExportWizard: actions.cancelImportExportWizard,
        triggerLocalContentExportTask: actions.triggerLocalContentExportTask,
        updateWizardLocalDriveList: actions.updateWizardLocalDriveList,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  #content-size
    font-weight: bold
    &::before
      content: "("
    &::after
      content: ")"

  $min-height = 200px

  .main
    text-align: left
    margin: 3em 0
    min-height: $min-height

  h2
    font-size: 1em

  .modal-message
    margin: 2em 0

  .error-svg
    margin-right: 0.2em
    margin-bottom: -6px

  .Buttons
    text-align: right

  button
    margin: 0.4em

  .refresh-btn-wrapper
    text-align: center

  .spinner
    height: $min-height

</style>
