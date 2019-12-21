<template>

  <KModal
    :title="title"
    size="medium"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="selectedDriveId === '' || notEnoughFreeSpace"
    @submit="goForward"
    @cancel="handleClickCancel"
  >
    <UiAlert
      v-if="notEnoughFreeSpace"
      type="error"
      :dismissible="false"
      :removeIcon="true"
    >
      {{ $tr('notEnoughFreeSpaceWarning') }}
    </UiAlert>
    <UiAlert
      v-if="driveStatus==='ERROR'"
      type="error"
      :dismissible="false"
    >
      {{ $tr('problemFindingLocalDrives') }}
    </UiAlert>

    <transition mode="out-in">
      <UiAlert
        v-if="driveStatus==='LOADING'"
        type="info"
        :dismissible="false"
      >
        <span class="finding-local-drives">
          {{ $tr('findingLocalDrives') }}
        </span>
      </UiAlert>
      <DriveList
        v-if="driveStatus===''"
        v-model="selectedDriveId"
        :drives="enabledDrives"
        :mode="driveListMode"
      />
    </transition>
  </KModal>

</template>


<script>

  import { mapActions, mapState, mapGetters, mapMutations } from 'vuex';
  import find from 'lodash/find';
  import UiAlert from 'keen-ui/src/UiAlert';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { TransferTypes } from '../../../constants';
  import DriveList from './DriveList';

  export default {
    name: 'SelectDriveModal',
    components: {
      DriveList,
      UiAlert,
    },
    mixins: [commonCoreStrings],
    props: {
      // For exports, provide the file size to show a warning if export size
      // is more than the drive's freespace
      exportFileSize: {
        type: Number,
        required: false,
      },
      manageMode: {
        type: Boolean,
        required: false,
      },
    },
    data() {
      return {
        driveStatus: '',
        selectedDriveId: '',
      };
    },
    computed: {
      ...mapGetters('manageContent/wizard', ['isImportingMore']),
      ...mapState('manageContent/wizard', ['driveList']),
      transferType() {
        if (this.manageMode) {
          return TransferTypes.LOCALEXPORT;
        } else {
          return this.$store.state.manageContent.wizard.transferType;
        }
      },
      driveCanBeUsedForTransfer() {
        if (this.manageMode) {
          return function isWritable({ drive }) {
            return drive.writable;
          };
        } else {
          return this.$store.getters['manageContent/wizard/driveCanBeUsedForTransfer'];
        }
      },
      inImportMode() {
        return this.transferType === TransferTypes.LOCALIMPORT;
      },
      title() {
        return this.$tr('selectDrive');
      },
      notEnoughFreeSpace() {
        if (!this.exportFileSize || !this.selectedDriveId) return false;

        return find(this.driveList, { id: this.selectedDriveId }).freespace < this.exportFileSize;
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
          if (this.enabledDrives.length > 0) {
            this.selectedDriveId = this.enabledDrives[0].id;
          }
        });
    },
    methods: {
      ...mapActions('manageContent', ['refreshDriveList']),
      ...mapActions('manageContent/wizard', ['goForwardFromSelectDriveModal']),
      ...mapMutations('manageContent/wizard', {
        resetContentWizardState: 'RESET_STATE',
      }),
      goForward() {
        if (this.manageMode) {
          this.$emit('submit', { driveId: this.selectedDriveId });
        } else {
          this.goForwardFromSelectDriveModal({
            driveId: this.selectedDriveId,
            forExport: !this.inImportMode,
          });
        }
      },
      handleClickCancel() {
        if (this.manageMode) {
          this.$emit('cancel');
        } else {
          this.resetContentWizardState();
        }
      },
    },
    $trs: {
      findingLocalDrives: 'Finding local drives…',
      problemFindingLocalDrives: 'There was a problem finding local drives.',
      selectDrive: 'Select a drive',
      // selectExportDestination: 'Select an export destination',
      notEnoughFreeSpaceWarning: {
        message: 'Not enough space available. Free up space on the drive or select fewer resources',
        context:
          '\nWarning that appears when a user has selected a drive without enough space for the selected resources',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
