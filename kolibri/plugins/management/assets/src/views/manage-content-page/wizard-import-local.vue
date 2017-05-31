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
        <drive-list
          :value="selectedDrive"
          :drives="wizardState.driveList"
          :enabledDrivePred="driveIsEnabled"
          :disabledMsg="$tr('incompatible')"
          @change="(driveId) => selectedDrive = driveId"
        />
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

  const actions = require('../../state/actions');

  module.exports = {
    $trNameSpace: 'wizardLocalImport',
    $trs: {
      title: 'Import from a Local Drive',
      incompatible: 'No content available',
      refresh: 'Refresh',
      cancel: 'Cancel',
      import: 'Import',
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
          this.selectedDrive !== '' &&
          !this.wizardState.busy
        );
      },
    },
    methods: {
      driveIsEnabled: (drive) => drive.metadata.channels.length > 0,
      submit() {
        this.triggerLocalContentImportTask(this.selectedDrive);
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

  .error-svg
    margin-right: 0.2em
    margin-bottom: -6px

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
