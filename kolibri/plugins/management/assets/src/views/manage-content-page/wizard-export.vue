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
          <template v-if="noDrives">
            <h2 class="core-text-alert">
              <mat-svg class="error-svg" category="alert" name="error_outline"/>
              {{ $tr('noDrivesDetected') }}
            </h2>
          </template>

          <template v-else>
            <p>
              {{ $tr('exportPromptPrefix', { numChannels: allChannels.length }) }}
              <span id="content-size">{{ exportContentSize }}</span>.
            </p>

            <h2>{{ $tr('drivesFound') }}</h2>
            <div class="drive-list">

              <div
                class="enabled drive-names"
                v-for="(drive, index) in enabledDrives"
                @click="selectDriveByID(drive.id)"
                :name="'drive-'+index"
              >
                <ui-radio
                  :id="'drive-'+index"
                  :trueValue="drive.id"
                  v-model="selectedDrive"
                >
                  <div>{{ drive.name }}</div>
                  <div class="drive-detail">
                    {{ bytesForHumans(drive.freespace) }} {{ $tr('available') }}
                  </div>
                </ui-radio>
              </div>

              <div class="disabled drive-names" v-for="(drive, index) in disabledDrives">
                <ui-radio
                  :id="'disabled-drive'+index"
                  :trueValue="drive.id"
                  disabled
                  v-model="selectedDrive"
                >
                  <div>{{ drive.name }}</div>
                  <div class="drive-detail">
                    {{ $tr('notWritable') }}
                  </div>
                </ui-radio>
              </div>

            </div>
          </template>
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
      drivesFound: 'Drives found:',
      export: 'Start Export',
      exportPromptContentSize: '{numChannels, number} {numChannels, plural, one {Channel} other {Channels}} ({totalSize})',
      exportPromptPrefix: 'You are about to export {numChannels, number} {numChannels, plural, one {Channel} other {Channels}}',
      noDrivesDetected: 'No drives were detected:',
      notWritable: 'Not writable',
      refresh: 'Refresh',
      title: 'Export to where?',
      waitForTotalSize: 'Calculating total size...',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'loading-spinner': require('kolibri.coreVue.components.loadingSpinner'),
      'ui-radio': require('keen-ui/src/UiRadio'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    data: () => ({
      selectedDrive: '', // used when there's more than one option
    }),
    computed: {
      noDrives() {
        return !Array.isArray(this.wizardState.driveList);
      },
      drivesLoading() {
        return this.wizardState.driveList === null;
      },
      enabledDrives() {
        return this.wizardState.driveList.filter(
          (drive) => drive.writable
        );
      },
      disabledDrives() {
        return this.wizardState.driveList.filter(
          (drive) => !drive.writable
        );
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
    methods: {
      submit() {
        this.triggerLocalContentExportTask(this.selectedDrive);
      },
      cancel() {
        if (!this.wizardState.busy) {
          this.cancelImportExportWizard();
        }
      },
      bytesForHumans,
      selectDriveByID(driveID) {
        this.selectedDrive = driveID;
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

  .drive-names
    padding: 0.6em
    border: 1px $core-bg-canvas solid
    &.disabled
      color: $core-text-disabled
    &.enabled
      &:hover
        background-color: $core-bg-canvas
      &, label
        cursor: pointer

  .drive-list:not(first-child)
    border-top: none

  .drive-detail
    color: $core-text-annotation
    font-size: 0.7em

  .Buttons
    text-align: right

  button
    margin: 0.4em

  .refresh-btn-wrapper
    text-align: center

  .spinner
    height: $min-height

</style>
