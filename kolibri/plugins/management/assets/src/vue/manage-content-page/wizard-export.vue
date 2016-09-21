<template>

  <core-modal
    title="Export Channel to a Local Drive"
    :error="wizardState.error ? true : false"
    :disableclose="wizardState.busy"
    :enablebgclickcancel="false"
    @cancel="cancel"
    @enter="submit"
  >
    <div>

      <template v-if="!drivesLoading">
        <p v-if="writableDrives.length === 0">
          No writable driveswere detected.
        </p>
        <p v-if="writableDrives.length === 1">
          Writable drive detected: {{ writableDrives[0].name }}
        </p>
        <template v-if="writableDrives.length > 1">
          <p>Writable drives detected:</p>
          <div v-for="(index, drive) in writableDrives">
            <input
              type="radio"
              :id="'drive-'+index"
              :value="drive.id"
              v-model="selectedDrive"
            >
            <label :for="'drive-'+index">{{drive.name}} {{index}}</label>
          </div>
        </template>

        <p v-if="unwritableDrives.length">Note: {{unwritableDrives.length}} additional drives were detected, but don't appear to be writable.</p>
      </template>
      <loading-spinner v-else></loading-spinner>

      <button @click="updateWizardLocalDriveList" :disabled="wizardState.busy">
        Refresh
      </button>
    </div>

    <div>
      {{ wizardState.error }}
    </div>

    <div>
      <button @click="cancel" :disabled="wizardState.busy">
        Cancel
      </button>
      <button @click="submit" :disabled="!canSubmit">
        Export
      </button>
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
        this.triggerLocalContentExportTask(this.driveToUse);
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


<style lang="stylus" scoped></style>
