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
      <template v-if="!drivesLoading">
        <div class="modal-message">
          <h2 class="core-text-alert" v-if="noDrives">
            <mat-svg class="error-svg" category="alert" name="error_outline"/>
            {{$tr('noDrivesDetected')}}
          </h2>
          <template v-else>
            <h2>{{$tr('drivesFound')}}</h2>
            <div class="drive-list">
              <div class="enabled drive-names" v-for="(drive, index) in drivesWithData"
                @click="selectDriveByID(drive.id)">
                <input
                  type="radio"
                  :id="'drive-'+index"
                  :value="drive.id"
                  v-model="selectedDrive"
                  name="drive-select"
                >
                <label :for="'drive-'+index">
                  {{drive.name}}
                  <br>
                </label>
              </div>
              <div class="disabled drive-names" v-for="(drive, index) in drivesWithoutData">
                <input
                  type="radio"
                  disabled
                  :id="'disabled-drive-'+index"
                >
                <label :for="'disabled-drive-'+index">
                  {{drive.name}}
                  <br>
                  <span class="drive-detail">{{$tr('incompatible')}}</span>
                </label>
              </div>
            </div>
          </template>
        </div>
        <div class="refresh-btn-wrapper">
          <icon-button
            :text="$tr('refresh')"
            @click="updateWizardLocalDriveList"
            :disabled="wizardState.busy">
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
        :text="$tr('import')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    $trNameSpace: 'wizard-local-import',
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
    },
    data: () => ({
      selectedDrive: undefined, // used when there's more than one option
    }),
    computed: {
      noDrives() {
        return !Array.isArray(this.wizardState.driveList);
      },
      driveToUse() {
        if (this.drivesWithData.length === 1) {
          return this.drivesWithData[0].id;
        }
        return this.selectedDrive;
      },
      drivesLoading() {
        return this.wizardState.driveList === null;
      },
      drivesWithData() {
        return this.wizardState.driveList.filter(
          (drive) => drive.metadata.channels.length
        );
      },
      drivesWithoutData() {
        return this.wizardState.driveList.filter(
          (drive) => !drive.metadata.channels.length
        );
      },
      canSubmit() {
        if (this.drivesLoading || this.wizardState.busy) {
          return false;
        }
        return Boolean(this.driveToUse);
      },
    },
    methods: {
      submit() {
        this.triggerLocalContentImportTask(this.driveToUse);
      },
      cancel() {
        if (!this.wizardState.busy) {
          this.cancelImportExportWizard();
        }
      },
      selectDriveByID(driveID) {
        this.selectedDrive = driveID;
      },
    },
    vuex: {
      getters: {
        wizardState: (state) => state.pageState.wizardState,
      },
      actions: {
        startImportWizard: actions.startImportWizard,
        updateWizardLocalDriveList: actions.updateWizardLocalDriveList,
        cancelImportExportWizard: actions.cancelImportExportWizard,
        triggerLocalContentImportTask: actions.triggerLocalContentImportTask,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

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
    label
      display: inline-table
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
