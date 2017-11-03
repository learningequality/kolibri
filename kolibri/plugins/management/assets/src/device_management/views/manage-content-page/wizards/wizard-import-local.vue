<template>

  <core-modal
    :title="$tr('title')"
    :enableBgClickCancel="false"
    @enter="submit"
    hideTopButtons
  >
    <div class="options">
      <drive-list
        v-if="!drivesLoading"
        :value="selectedDrive"
        :drives="wizardState.driveList"
        :enabledDrivePred="driveIsEnabled"
        :disabledMsg="$tr('incompatible')"
        @change="(driveId) => selectedDrive = driveId"
      />
      <loading-spinner
        v-else
        :delay="500"
        class="spinner"
      />
    </div>

    <ui-alert v-if="wizardState.error" type="error">
      {{ wizardState.error }}
    </ui-alert>

    <div class="buttons">
      <k-button
        :text="$tr('cancel')"
        appearance="flat-button"
        @click="cancel"
      />
      <k-button
        :text="$tr('import')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"
      />
    </div>
  </core-modal>

</template>


<script>

  import {
    transitionWizardPage,
    updateWizardLocalDriveList,
  } from '../../../state/actions/contentWizardActions';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import uiAlert from 'keen-ui/src/UiAlert';
  import driveList from './drive-list';
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
      uiAlert,
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
        transitionWizardPage,
        updateWizardLocalDriveList,
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

  .buttons
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
