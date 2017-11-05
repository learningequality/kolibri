<template>

  <core-modal
    :title="title"
    :enableBgClickCancel="false"
    hideTopButtons
  >
    <div
      v-if="driveListLoading"
      class="drive-list-loading"
    >
      {{ $tr('findingLocalDrives') }}
    </div>

    <drive-list
      v-else
      v-model="selectedDriveId"
      :drives="enabledDrives"
    />

    <div class="buttons">
      <k-button
        :text="$tr('cancel')"
        @click="cancel"
        appearance="flat-button"
      />
      <k-button
        :text="$tr('continue')"
        @click="goForward"
        :disabled="continueDisabled"
        :primary="true"
      />
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { wizardState } from '../../../state/getters';
  import driveList from './drive-list';
  import { transitionWizardPage } from '../../../state/actions/contentWizardActions';

  export default {
    name: 'selectDriveModal',
    components: {
      coreModal,
      driveList,
      kButton,
    },
    data() {
      return {
        selectedDriveId: '',
      };
    },
    computed: {
      inImportMode() {
        return this.transferType === 'localimport';
      },
      continueDisabled() {
        return this.selectedDriveId === '';
      },
      title() {
        if (this.inImportMode) {
          return this.$tr('selectDrive');
        }
        return this.$tr('selectExportDestination');
      },
      enabledDrives() {
        return this.driveList.filter(this.driveIsEnabled);
      }
    },
    methods: {
      driveIsEnabled(drive) {
        if (this.inImportMode) {
          return drive.metadata.channels.length > 0;
        }
        return drive.writable;
      },
      goForward() {
        this.transitionWizardPage('forward', {
          driveId: this.selectedDriveId,
        });
      },
      cancel() {
        this.transitionWizardPage('cancel');
      },
    },
    vuex: {
      getters: {
        driveListLoading: state => wizardState(state).driveListLoading,
        driveList: state => wizardState(state).driveList,
        transferType: state => wizardState(state).meta.transferType,
      },
      actions: {
        transitionWizardPage,
      }
    },
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      findingLocalDrives: 'Finding local drives…',
      selectDrive: 'Select a drive',
      selectExportDestination: 'Select an export destination',
    },
  };

</script>


<style lang="stylus" scoped>

  .buttons
    text-align: right
    button:nth-child(2)
      margin-right: 0

</style>
