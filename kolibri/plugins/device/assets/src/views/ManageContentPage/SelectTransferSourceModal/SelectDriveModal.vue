<template>

  <KModal
    :title="title"
    size="medium"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="selectedDriveId===''"
    @submit="goForward"
    @cancel="resetContentWizardState"
  >
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
    data() {
      return {
        driveStatus: '',
        selectedDriveId: '',
      };
    },
    computed: {
      ...mapGetters('manageContent/wizard', ['driveCanBeUsedForTransfer', 'isImportingMore']),
      ...mapState('manageContent/wizard', ['driveList', 'transferType']),
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
      ...mapActions('manageContent', ['refreshDriveList']),
      ...mapActions('manageContent/wizard', ['goForwardFromSelectDriveModal']),
      ...mapMutations('manageContent/wizard', {
        resetContentWizardState: 'RESET_STATE',
      }),
      goForward() {
        this.goForwardFromSelectDriveModal({
          driveId: this.selectedDriveId,
          forExport: !this.inImportMode,
        });
      },
    },
    $trs: {
      findingLocalDrives: 'Finding local drives…',
      problemFindingLocalDrives: 'There was a problem finding local drives.',
      selectDrive: 'Select a drive',
      selectExportDestination: 'Select an export destination',
    },
  };

</script>


<style lang="scss" scoped></style>
