<template>

  <core-modal
    title="Export to a Local Drive"
    :error="wizardState.error ? true : false"
    :enableBgClickCancel="false"
    @cancel="cancel"
    @enter="submit"
  >
    <div class="main">
      <template v-if="!drivesLoading">
        <div class="modal-message">
          <h2>Writable drives detected:</h2>
          <div class="drive-list">
            <div class="drive-names" v-for="(drive, index) in writableDrives">
              <input
                type="radio"
                :id="'drive-'+index"
                :value="drive.id"
                v-model="selectedDrive"
              >
              <label :for="'drive-'+index">
                {{drive.name}}
                {{megabyteCalc(drive.freespace)}} MB Free
              </label>
            </div>
            <div class="disabled drive-names" v-for="(drive, index) in unwritableDrives">
              <input
                type="radio"
                disabled
                :id="'-disabled-drive-'+index"
              >
              <label :for="'disabled-drive-'+index">
                {{drive.name}}
                <br>
                Unwritable
              </label>
            </div>
          </div>
        </div>
        <div class="refresh-btn-wrapper">
          <icon-button @click="updateWizardLocalDriveList" :disabled="wizardState.busy" text="Refresh">
            <svg src="../icons/refresh.svg"/>
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
        text="Cancel"/>
      <icon-button
        text="Export"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
      megabyteCalc(byteCount) {
        return Math.floor((byteCount) / 2048);
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

  .drive-list
    margin: 2em

  .drive-names
    padding: 0.6em
    border: 1px grey solid
    border-top: none

  .drive-names:first-child
    border-top: 1px grey solid

  .button-wrapper
    margin: 1em 0
    text-align: center

  button
    margin: 0.4em

  .refresh-btn-wrapper
    text-align: center

  .spinner
    height: $min-height

</style>
