<template>

  <k-modal
    :title="title"
    size="small"
    :submitText="$tr('continue')"
    :cancelText="$tr('cancel')"
    :submitDisabled="selectedDriveId===''"
    @submit="goForward"
    @cancel="resetContentWizardState"
  >
    <ui-alert
      v-if="driveStatus==='ERROR'"
      type="error"
      :dismissible="false"
    >
      {{ $tr('problemFindingLocalDrives') }}
    </ui-alert>

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
      <drive-list
        v-if="driveStatus===''"
        v-model="selectedDriveId"
        :drives="enabledDrives"
        :mode="driveListMode"
      />
    </transition>
  </k-modal>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import UiAlert from 'keen-ui/src/UiAlert';
  import kModal from 'kolibri.coreVue.components.kModal';
  import { wizardState } from '../../../state/getters';
  import { TransferTypes } from '../../../constants';
  import driveList from './drive-list';

  export default {
    name: 'selectDriveModal',
    components: {
      driveList,
      UiAlert,
      kModal,
    },
    data() {
      return {
        driveStatus: '',
        selectedDriveId: '',
        showError: false,
      };
    },
    computed: {
      ...mapGetters(['driveCanBeUsedForTransfer', 'isImportingMore']),
      ...mapState({
        driveList: state => wizardState(state).driveList,
        transferType: state => wizardState(state).transferType,
        transferredChannel: state => wizardState(state).transferredChannel,
      }),
      inImportMode() {
        return this.transferType === TransferTypes.LOCALIMPORT;
      },
      title() {
        if (this.inImportMode) {
          return this.$tr('selectDrive');
        }
        return this.$tr('selectExportDestination');
      },
      enabledDrives() {
        return this.driveList.filter(drive =>
          this.driveCanBeUsedForTransfer({ drive, transferType: this.transferType })
        );
      },
      driveListMode() {
        if (this.inImportMode) {
          return this.isImportingMore ? 'IMPORT_MORE' : 'IMPORT';
        }
        return 'EXPORT';
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
      ...mapActions([
        'goForwardFromSelectDriveModal',
        'refreshDriveList',
        'resetContentWizardState',
      ]),
      goForward() {
        this.goForwardFromSelectDriveModal({
          driveId: this.selectedDriveId,
          forExport: !this.inImportMode,
        });
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
