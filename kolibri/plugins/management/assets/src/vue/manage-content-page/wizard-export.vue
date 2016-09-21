<template>

  <core-modal
    title="Export to a Local Drive"
    :error="wizardState.error ? true : false"
    :disableclose="wizardState.busy"
    :enablebgclickcancel="false"
    @cancel="cancel"
    @enter="submit"
  >
    <div class="main">
      <template v-if="!drivesLoading">
        <div class="modal-message">
          <h2 class="core-text-alert" v-if="writableDrives.length === 0">
            <svg class="error-svg" src="../icons/error.svg"></svg>
            No writable driveswere detected.
          </h2>
          <h2 v-if="writableDrives.length === 1">
            Writable drive detected: {{ writableDrives[0].name }}
          </h2>
          <template v-if="writableDrives.length > 1">
            <h2>Writable drives detected:</h2>
            <div class="drive-list">
              <div class="drive-names" v-for="(index, drive) in writableDrives">
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

          <p class="core-text-annotation" v-if="unwritableDrives.length"><strong>Note:</strong> {{unwritableDrives.length}} additional drives were detected, but don't appear to be writable.</p>
        </div>
        <div class="refresh-btn-wrapper">
          <icon-button @click="updateWizardLocalDriveList" :disabled="wizardState.busy" text="Refresh">
            <svg src="../icons/refresh.svg"></svg>
          </icon-button>
        </div>
      </template>
      <loading-spinner v-else :delay="0" class="spinner"></loading-spinner>
    </div>
    <div class="core-text-alert">
      {{ wizardState.error }}
    </div>
    <div class="button-wrapper">
      <button @click="cancel" :disabled="wizardState.busy">
        Cancel
      </button>
      <icon-button
        text="Export"
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
      'core-modal': require('kolibri/coreVue/components/coreModal'),
      'icon-button': require('kolibri/coreVue/components/iconButton'),
    },
    data: () => ({
      selectedDrive: undefined, // used when there's more than one option
    }),
    computed: {
      driveToUse() {
        if (this.writableDrives.length === 1) {
          return this.writableDrives[0].id;
        }
        return this.selectedDrive;
      },
      drivesLoading() {
        return this.wizardState.driveList === null;
      },
      writableDrives() {
        return this.wizardState.driveList.filter(
          (drive) => drive.writable
        );
      },
      unwritableDrives() {
        return this.wizardState.driveList.filter(
          (drive) => !drive.writable
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
        if (this.canSubmit) {
          this.triggerLocalContentExportTask(this.driveToUse);
        }
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
        triggerLocalContentExportTask: actions.triggerLocalContentExportTask,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  .main
    text-align: center
    margin: 3em 0

  h2
    font-size: 1em

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

  .refresh-btn-wrapper
    text-align: center

  .spinner
    height: 200px

</style>
