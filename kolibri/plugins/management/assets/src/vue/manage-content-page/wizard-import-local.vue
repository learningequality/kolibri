<template>

  <core-modal
    title="Import from a Local Drive"
    :error="wizardState.error"
    :enablebgclickcancel="false"
    :disableclose="wizardState.busy"
    :enablebackbtn="true"
    @cancel="cancel"
    @enter="submit"
    @back="startImportWizard"
  >
    <div class="main">

      <template v-if="!drivesLoading">
        <div class="modal-message">
          <h2 class="core-text-alert" v-if="drivesWithData.length === 0">
            <svg class="error-svg" src="../icons/error.svg"></svg>No drives with data were detected.
          </h2>
          <h2 v-if="drivesWithData.length === 1">
            Drive detected with data: {{ drivesWithData[0].name }}
          </h2>
          <template v-if="drivesWithData.length > 1">
            <h2>Drives detected with data:</h2>
            <div class="drive-list">
              <div class="drive-names" v-for="(index, drive) in drivesWithData">
                <input
                  type="radio"
                  :id="'drive-'+index"
                  :value="drive.id"
                  v-model="selectedDrive"
                >
                <label :for="'drive-'+index">{{drive.name}} {{index}}</label>
              </div>
            </div>
          </template>

          <p class="core-text-annotation" v-if="drivesWithoutData.length"><strong>Note:</strong> {{drivesWithoutData.length}} additional drives were detected, but don't appear to have data on them.</p>
        </div>
      </template>
      <loading-spinner v-else></loading-spinner>

      <icon-button
        text="Refresh"
        @click="updateWizardLocalDriveList"
        :disabled="wizardState.busy">
        <svg src="../icons/refresh.svg"></svg>
      </icon-button>
    </div>
    <div class="button-wrapper">
      <button @click="cancel" :disabled="wizardState.busy">
        Cancel
      </button>
      <icon-button
        text="Import"
        @click="submit"
        :disabled="!canSubmit"
        :primary="false" >
      </icon-button>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
    },
    data: () => ({
      selectedDrive: undefined, // used when there's more than one option
    }),
    computed: {
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

  @require '~core-theme.styl'

  .main
    text-align: center
    margin: 4em 0

  .modal-message
    margin: 2em 0

  .error-svg
    margin: 0 0.6em

  .drive-list
    margin: 2em

  .drive-names
    margin: 0.6em 0

  .button-wrapper
    margin: 1em 0
    text-align: center

  button
    margin: 0.4em

</style>
