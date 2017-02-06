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
          <h2 class="core-text-alert" v-if="noDrives">
            <svg class="error-svg" src="../icons/error.svg"/>
            {{$tr('noDrivesDetected')}}
          </h2>
          <template v-else>
            <h2>{{$tr('drivesFound')}}</h2>
            <div class="drive-list">
              <div class="enabled drive-names" v-for="(drive, index) in writableDrives"
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
                  <span class="drive-detail">
                    {{$tr('available')}} {{bytesForHumans(drive.freespace)}}
                  </span>
                </label>
              </div>
              <div class="disabled drive-names" v-for="(drive, index) in unwritableDrives">
                <input
                  type="radio"
                  disabled
                  :id="'disabled-drive-'+index"
                >
                <label :for="'disabled-drive-'+index">
                  {{drive.name}}
                  <br>
                  <span class="drive-detail">{{$tr('notWritable')}}</span>
                </label>
              </div>
            </div>
          </template>
        </div>
        <div class="refresh-btn-wrapper">
          <icon-button @click="updateWizardLocalDriveList" :disabled="wizardState.busy" :text="$tr('refresh')">
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
        :text="$tr('cancel')"/>
      <icon-button
        :text="$tr('export')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    $trNameSpace: 'wizard-export',
    $trs: {
      title: 'Export to a Local Drive',
      available: 'Available Storage:',
      noDrivesDetected: 'No drives were detected:',
      drivesFound: 'Drives detected:',
      notWritable: 'Not Writable',
      cancel: 'Cancel',
      export: 'Export',
      refresh: 'Refresh',
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
      bytesForHumans(bytes) {
        // breaking down byte counts in terms of larger sizes
        const kilobyte = 1024;
        const megabyte = Math.pow(kilobyte, 2);
        const gigabyte = Math.pow(kilobyte, 3);

        function kilobyteCalc(byteCount) {
          const kilos = Math.floor(byteCount / kilobyte);
          return `${kilos} KB`;
        }
        function megabyteCalc(byteCount) {
          const megs = Math.floor(byteCount / megabyte);
          return `${megs} MB`;
        }
        function gigabyteCalc(byteCount) {
          const gigs = Math.floor(byteCount / gigabyte);
          return `${gigs} GB`;
        }
        function chooseSize(byteCount) {
          if (byteCount > gigabyte) {
            return gigabyteCalc(byteCount);
          } else if (byteCount > megabyte) {
            return megabyteCalc(byteCount);
          } else if (byteCount > kilobyte) {
            return kilobyteCalc(byteCount);
          }
          return `${bytes} B`;
        }

        return chooseSize(bytes);
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

</style>
