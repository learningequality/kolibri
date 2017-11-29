<template>

  <core-modal
    :title="title"
    :enableBgClickCancel="false"
    hideTopButtons
    @enter="goForward"
    @cancel="cancel"
  >
    <transition mode="out-in">
      <ui-alert
        v-if="driveStatus==='LOADING'"
        type="info"
        :dismissible="false"
      >
        <span class="finding-local-drives">
          {{ $tr('findingLocalDrives') }}
        </span>
      </ui-alert>

      <ui-alert
        v-else-if="driveStatus==='ERROR'"
        type="error"
        :dismissible="false"
      >
        {{ $tr('problemFindingLocalDrives') }}
      </ui-alert>

    </transition>

    <drive-list
      v-if="driveStatus===''"
      v-model="selectedDriveId"
      :drives="enabledDrives"
      :mode="inImportMode ? 'IMPORT' : 'EXPORT'"
    />

    <div class="buttons">
      <k-button
        :text="$tr('cancel')"
        @click="cancel"
        appearance="flat-button"
      />
      <k-button
        class="forward-button"
        :text="$tr('continue')"
        @click="goForward"
        :disabled="continueIsDisabled"
        :primary="true"
      />
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import UiAlert from 'keen-ui/src/UiAlert';
  import driveList from './drive-list';
  import { refreshDriveList } from '../../../state/actions/taskActions';
  import { transitionWizardPage } from '../../../state/actions/contentWizardActions';
  import { wizardState } from '../../../state/getters';
  import { TransferTypes } from '../../../constants';

  export default {
    name: 'selectDriveModal',
    components: {
      coreModal,
      driveList,
      kButton,
      UiAlert,
    },
    data() {
      return {
        driveStatus: '',
        selectedDriveId: '',
        showError: false,
      };
    },
    computed: {
      inImportMode() {
        return this.transferType === TransferTypes.LOCALIMPORT;
      },
      continueIsDisabled() {
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
      },
    },
    mounted() {
      this.driveStatus = 'LOADING';
      this.refreshDriveList()
        .catch(() => {
          this.driveStatus = 'ERROR';
        })
        .then(() => {
          this.driveStatus = '';
        });
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
        driveList: state => wizardState(state).driveList,
        transferType: state => wizardState(state).transferType,
      },
      actions: {
        transitionWizardPage,
        refreshDriveList,
      },
    },
    $trs: {
      cancel: 'Cancel',
      continue: 'Continue',
      findingLocalDrives: 'Finding local drives…',
      problemFindingLocalDrives: 'There was a problem finding local drives.',
      selectDrive: 'Select a drive',
      selectExportDestination: 'Select an export destination',
    },
  };

</script>


<style lang="stylus" scoped>

  .buttons
    text-align: right

  .forward-button
    margin-right: 0

</style>
