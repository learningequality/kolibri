<template>

  <div>
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

    <div class="core-modal-buttons">
      <k-button
        :text="$tr('cancel')"
        @click="$emit('cancel')"
        appearance="flat-button"
      />
      <k-button
        :text="$tr('continue')"
        @click="goForward"
        :disabled="continueIsDisabled"
        :primary="true"
      />
    </div>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { refreshDriveList } from '../../../state/actions/taskActions';
  import { goForwardFromSelectDriveModal } from '../../../state/actions/contentWizardActions';
  import { wizardState, driveCanBeUsedForTransfer } from '../../../state/getters';
  import { TransferTypes } from '../../../constants';
  import driveList from './drive-list';

  export default {
    name: 'selectDriveModal',
    components: {
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
          this.selectedDriveId = this.enabledDrives.length === 1 ? this.enabledDrives[0].id : '';
        });
    },
    methods: {
      driveIsEnabled(drive) {
        return this.driveCanBeUsedForTransfer(drive, this.transferType);
      },
      goForward() {
        this.goForwardFromSelectDriveModal({
          driveId: this.selectedDriveId,
          forExport: !this.inImportMode,
        });
      },
    },
    vuex: {
      getters: {
        driveList: state => wizardState(state).driveList,
        transferType: state => wizardState(state).transferType,
        transferredChannel: state => wizardState(state).transferredChannel,
        driveCanBeUsedForTransfer,
      },
      actions: {
        goForwardFromSelectDriveModal,
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


<style lang="stylus" scoped></style>
