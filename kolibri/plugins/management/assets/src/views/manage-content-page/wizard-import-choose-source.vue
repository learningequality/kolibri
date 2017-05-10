<template>

  <core-modal
    :title="$tr('title')"
    :error="wizardState.error"
    :enableBgClickCancel="false"
    @cancel="cancel"
    @enter="submit"
  >
    <div class="main">

      <div>
        <h2>{{ $tr('theInternet') }}</h2>
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
                <div>{{ $tr('enterChannelId') }}</div>
                <div>{{ $tr('searchForChannel') }}</div>
              </div>
            </div>
          </ui-radio>
        </div>
      </div>
      <template v-if="!drivesLoading">
        <div class="modal-message">
          <drive-list
            :value="selectedDrive"
            :drives="wizardState.driveList"
            :enabledDrivePred="isEnabledDrive"
            :disabledMsg="$tr('incompatible')"
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
      title: 'Import from where?',
      incompatible: 'No content available',
      refresh: 'Refresh',
      cancel: 'Cancel',
      import: 'Import',
      theInternet: 'The Internet',
      enterChannelId: 'Enter a channel ID',
      searchForChannel: 'Search for a specific channel',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'drive-list': require('./wizards/drive-list'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'loading-spinner': require('kolibri.coreVue.components.loadingSpinner'),
      'ui-radio': require('keen-ui/src/UiRadio'),
    },
    data: () => ({
      selectedDrive: '', // used when there's more than one option
    }),
    computed: {
      INTERNET_SOURCE: () => INTERNET_SOURCE,
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
    },
    beforeMount() {
      this.updateWizardLocalDriveList();
    },
    methods: {
      isEnabledDrive(drive) {
        return drive.metadata.channels.length > 0;
      },
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
    &.enabled
      &:hover
        background-color: $core-bg-canvas
      &, label
        cursor: pointer

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
