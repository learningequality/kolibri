<template>

  <core-modal
    :title="$tr('title')"
    :error="wizardState.error"
    :enableBgClickCancel="false"
    :enableBackBtn="true"
    @cancel="cancel"
    @enter="submit"
    @back="startImportWizard"
  >
    <div class="main">

      <div>
        <h2>The Internet</h2>
        <div
          @click="selectedDrive=INTERNET_SOURCE"
          class="enabled drive-names"
          name="internet_source"
        >
          <ui-radio
            :id="INTERNET_SOURCE"
            :trueValue="INTERNET_SOURCE"
            v-model="selectedDrive"
          >
            <div class="InternetSource">
              <div class="InternetSource__icon">
                <mat-svg category="social" name="public" transform="translate(20, 0)" />
                <mat-svg category="file" name="file_download" transform="translate(-25, 10)" fill="#00BAFF" />
              </div>
              <div class="InternetSource__description">
                <div>Enter a channel ID</div>
                <div>Search for a specific channel</div>
              </div>
            </div>
          </ui-radio>
        </div>
      </div>
      <template v-if="!drivesLoading">
        <div class="modal-message">
          <h2 class="core-text-alert" v-if="noDrives">
            <mat-svg class="error-svg" category="alert" name="error_outline"/>
            {{ $tr('noDrivesDetected') }}
          </h2>

          <template v-else>
            <h2>{{$tr('drivesFound')}}</h2>
            <div class="drive-list">

              <div
                :name="'drive-'+index"
                @click="selectedDrive=drive.id"
                class="enabled drive-names"
                v-for="(drive, index) in enabledDrives"
              >
                <ui-radio
                  :id="'drive-'+index"
                  :trueValue="drive.id"
                  v-model="selectedDrive"
                >
                  <div>{{ drive.name }}</div>
                </ui-radio>
              </div>

              <div class="disabled drive-names" v-for="(drive, index) in disabledDrives">
                <ui-radio
                  :id="'disabled-drive-'+index"
                  :trueValue="drive.id"
                  disabled
                  v-model="selectedDrive"
                >
                  <div>{{ drive.name }}</div>
                  <div class="drive-detail">
                    {{ $tr('incompatible') }}
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
    <div class="button-wrapper">
      <icon-button
        @click="cancel"
        :text="$tr('cancel')"/>
      <icon-button
        name="next"
        :text="$tr('import')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  const find = require('lodash/find');
  const actions = require('../../state/actions');

  const INTERNET_SOURCE = 'internet_source';

  module.exports = {
    $trNameSpace: 'wizardLocalImport',
    $trs: {
      title: 'Import from a Local Drive',
      noDrivesDetected: 'No drives were detected',
      drivesFound: 'Drives detected:',
      incompatible: 'No content available',
      refresh: 'Refresh',
      cancel: 'Cancel',
      import: 'Import',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'loading-spinner': require('kolibri.coreVue.components.loadingSpinner'),
      'UiRadio': require('keen-ui/src/UiRadio'),
    },
    data: () => ({
      selectedDrive: '', // used when there's more than one option
    }),
    computed: {
      INTERNET_SOURCE: () => INTERNET_SOURCE,
      noDrives() {
        return !Array.isArray(this.wizardState.driveList);
      },
      drivesLoading() {
        return this.wizardState.driveList === null;
      },
      enabledDrives() {
        return this.wizardState.driveList.filter(
          (drive) => drive.metadata.channels.length > 0
        );
      },
      disabledDrives() {
        return this.wizardState.driveList.filter(
          (drive) => drive.metadata.channels.length === 0
        );
      },
      canSubmit() {
        return (
          !this.drivesLoading &&
          !this.wizardState.busy &&
          Boolean(this.selectedDrive)
        );
      },
    },
    methods: {
      submit() {
        if (this.selectedDrive === INTERNET_SOURCE) {
          return this.showImportNetworkWizard();
        }
        const driveInfo = find(this.wizardState.driveList, { id: this.selectedDrive });
        return this.showLocalImportPreview({
          driveId: this.selectedDrive,
          channels: driveInfo.metadata.channels,
          driveName: driveInfo.name,
        });
      },
      cancel() {
        if (!this.wizardState.busy) {
          this.cancelImportExportWizard();
        }
      },
    },
    vuex: {
      getters: {
        wizardState: (state) => state.pageState.wizardState,
      },
      actions: {
        cancelImportExportWizard: actions.cancelImportExportWizard,
        showImportNetworkWizard: actions.showImportNetworkWizard,
        showLocalImportPreview: actions.showLocalImportPreview,
        startImportWizard: actions.startImportWizard,
        triggerLocalContentImportTask: actions.triggerLocalContentImportTask,
        updateWizardLocalDriveList: actions.updateWizardLocalDriveList,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $min-height = 200px

  .main
    text-align: left
    margin: 3em 0
    min-height: $min-height

  .InternetSource
    display: table
    &__icon
      display: table-cell
      vertical-align: middle
    &__description
      display: table-cell
      vertical-align: middle

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
    label
      font-size: 0.9em
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


  .button-wrapper
    margin: 1em 0
    text-align: center

  button
    margin: 0.4em

  .refresh-btn-wrapper
    text-align: center

  .spinner
    height: $min-height

  .core-text-alert
    text-align: center

</style>
