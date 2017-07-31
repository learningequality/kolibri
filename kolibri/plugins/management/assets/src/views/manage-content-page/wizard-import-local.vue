<template>

  <core-modal
    :title="$tr('title')"
    :error="wizardState.error"
    :enableBgClickCancel="false"
    :enableBackBtn="true"
    @cancel="cancel"
    @enter="submit"
    @back="goBack"
  >
    <div class="main">
      <template v-if="!drivesLoading">
        <div class="modal-message">
          <drive-list
            :value="selectedDrive"
            :drives="wizardState.driveList"
            :enabledDrivePred="driveIsEnabled"
            :disabledMsg="$tr('incompatible')"
            @change="(driveId) => selectedDrive = driveId"
          />
        </div>
        <div class="refresh-btn-wrapper">
          <k-button
            :text="$tr('refresh')"
            @click="updateWizardLocalDriveList"
            :disabled="wizardState.busy"
          />
        </div>
      </template>
      <loading-spinner v-else :delay="500" class="spinner"/>
    </div>
    <div class="core-text-alert">
      {{ wizardState.error }}
    </div>
    <div class="button-wrapper">
      <k-button
        @click="cancel"
        :raised="false"
        :text="$tr('cancel')"/>
      <k-button
        :text="$tr('import')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  import * as manageContentActions from '../../state/manageContentActions';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import driveList from './wizards/drive-list';
  export default {
    name: 'wizardLocalImport',
    $trs: {
      title: 'Import from a Local Drive',
      incompatible: 'No content available',
      refresh: 'Refresh',
      cancel: 'Cancel',
      import: 'Import',
    },
    components: {
      coreModal,
      kButton,
      loadingSpinner,
      driveList,
    },
    data: () => ({ selectedDrive: '' }),
    computed: {
      drivesLoading() {
        return this.wizardState.driveList === null;
      },
      canSubmit() {
        return !this.drivesLoading && this.selectedDrive !== '' && !this.wizardState.busy;
      },
    },
    mounted() {
      this.updateWizardLocalDriveList();
    },
    methods: {
      driveIsEnabled: drive => drive.metadata.channels.length > 0,
      goBack() {
        this.transitionWizardPage('backward');
      },
      submit() {
        this.transitionWizardPage('forward', { driveId: this.selectedDrive });
      },
      cancel() {
        if (!this.wizardState.busy) {
          this.transitionWizardPage('cancel');
        }
      },
    },
    vuex: {
      getters: { wizardState: state => state.pageState.wizardState },
      actions: {
        transitionWizardPage: manageContentActions.transitionWizardPage,
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

  .core-text-alert
    text-align: center

</style>
