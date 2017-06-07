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
          <drive-list
            :value="selectedDrive"
            :drives="wizardState.driveList"
            :enabledDrivePred="driveIsEnabled"
            :disabledMsg="$tr('notWritable')"
            :enabledMsg="formatEnabledMsg"
            @change="(driveId) => selectedDrive = driveId"
          />
        </div>
        <div class="refresh-btn-wrapper">
          <icon-button @click="updateWizardLocalDriveList" :disabled="wizardState.busy" :text="$tr('refresh')">
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
        :text="$tr('export')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../state/actions');

  module.exports = {
    $trNameSpace: 'wizardExport',
    $trs: {
      title: 'Export to a Local Drive',
      available: 'Available Storage:',
      notWritable: 'Not writable',
      cancel: 'Cancel',
      export: 'Export',
      refresh: 'Refresh',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'loading-spinner': require('kolibri.coreVue.components.loadingSpinner'),
      'drive-list': require('./wizards/drive-list'),
    },
    data: () => ({
      selectedDrive: '',
    }),
    computed: {
      drivesLoading() {
        return this.wizardState.driveList === null;
      },
      canSubmit() {
        return (
          !this.drivesLoading &&
          !this.wizardState.busy &&
          this.selectedDrive !== ''
        );
      },
    },
    methods: {
      formatEnabledMsg(drive) {
        return `${this.$tr('available')} ${this.bytesForHumans(drive.freespace)}`;
      },
      driveIsEnabled(drive) {
        return drive.writable;
      },
      submit() {
        if (this.canSubmit) {
          this.triggerLocalContentExportTask(this.selectedDrive);
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
        const megabyte = kilobyte ** 2;
        const gigabyte = kilobyte ** 3;

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

  @require '~kolibri.styles.definitions'

  $min-height = 200px

  .main
    text-align: left
    margin: 3em 0
    min-height: $min-height

  h2
    font-size: 1em

  .modal-message
    margin: 2em 0

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
