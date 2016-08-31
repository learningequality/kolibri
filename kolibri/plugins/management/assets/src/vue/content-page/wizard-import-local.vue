<template>

  <modal
    title="Import Channel from a Local Drive"
    :error="wizardState.error"
    :noclose="wizardState.busy"
    @cancel="cancel"
    @submit="submit"
  >
    <div slot="body">

      <template v-if="!drivesLoading">
        <p v-if="drivesWithData.length === 0">
          No drives with data were detected.
        </p>
        <p v-if="drivesWithData.length === 1">
          Drive detected with data: {{ drivesWithData[0].name }}
        </p>
        <template v-if="drivesWithData.length > 1">
          <p>Drives detected with data:</p>
          <div v-for="(index, drive) in drivesWithData">
            <input
              type="radio"
              :id="'drive-'+index"
              :value="drive.id"
              v-model="selectedDrive"
            >
            <label :for="'drive-'+index">{{drive.name}} {{index}}</label>
          </div>
        </template>

        <p v-if="drivesWithoutData.length">Note: {{drivesWithoutData.length}} additional drives were detected, but don't appear to have data on them.</p>
      </template>
      <loading-spinner v-else></loading-spinner>

      <button @click="refresh" :disabled="wizardState.busy">
        Refresh
      </button>
    </div>
    <div slot="buttons">
      <button @click="cancel" :disabled="wizardState.busy">
        Cancel
      </button>
      <button @click="submit" :disabled="!canSubmit">
        Import
      </button>
    </div>
  </modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'modal': require('./modal'),
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
      refresh() {
        this.updateWizardLocalDriveList();
      },
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
        updateWizardLocalDriveList: actions.updateWizardLocalDriveList,
        cancelImportExportWizard: actions.cancelImportExportWizard,
        triggerLocalContentImportTask: actions.triggerLocalContentImportTask,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
