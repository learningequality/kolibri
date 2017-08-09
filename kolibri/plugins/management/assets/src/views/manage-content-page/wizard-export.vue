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
          <p>
            {{ $tr('exportPromptPrefix', { numChannels: allChannels.length }) }}
            ({{ exportContentSize }})
          </p>
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
          <k-button @click="updateWizardLocalDriveList" :disabled="wizardState.busy" :text="$tr('refresh')"/>
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
        :text="$tr('export')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"/>
    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  import * as manageContentActions from '../../state/manageContentActions';
  import bytesForHumans from './bytesForHumans';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import driveList from './wizards/drive-list';
  import sumBy from 'lodash/sumBy';

  export default {
    name: 'wizardExport',
    $trs: {
      available: 'available',
      cancel: 'Cancel',
      export: 'Export',
      exportPromptPrefix: 'You are about to export {numChannels, number} {numChannels, plural, one {channel} other {channels}}',
      notWritable: 'Not writable',
      refresh: 'Refresh',
      title: 'Export to where?',
      waitForTotalSize: 'Calculating total size...',
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
        return !this.drivesLoading && !this.wizardState.busy && this.selectedDrive !== '';
      },
      exportContentSize() {
        const allChannelsHaveStats = this.allChannels.length === Object.keys(this.channelsWithStats).length;
        if (allChannelsHaveStats) {
          const totalSize = sumBy(Object.values(this.channelsWithStats), 'totalFileSizeInBytes');
          return bytesForHumans(totalSize);
        }
        return this.$tr('waitForTotalSize');
      },
    },
    methods: {
      formatEnabledMsg(drive) {
        return `${bytesForHumans(drive.freespace)} ${this.$tr('available')}`;
      },
      driveIsEnabled(drive) {
        return drive.writable;
      },
      submit() {
        if (this.canSubmit) {
          this.transitionWizardPage('forward', { driveId: this.selectedDrive });
        }
      },
      cancel() {
        if (!this.wizardState.busy) {
          this.transitionWizardPage('cancel');
        }
      },
      selectDriveByID(driveID) {
        this.selectedDrive = driveID;
      },
    },
    vuex: {
      getters: {
        allChannels: (state) => state.core.channels.list,
        channelsWithStats: state => state.pageState.channelFileSummaries,
        wizardState: state => state.pageState.wizardState,
      },
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

</style>
