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
        :disabledMsg="$tr('notWritable')"
        :enabledMsg="formatEnabledMsg"
        @change="(driveId) => selectedDrive = driveId"
      />
      <loading-spinner v-else :delay="500" class="spinner" />
    </div>

    <ui-alert v-if="wizardState.error" type="error">
      {{ wizardState.error }}
    </ui-alert>

    <div class="buttons">
      <k-button
        :text="$tr('cancel')"
        @click="cancel"
        appearance="flat-button"
      />
      <k-button
        :text="$tr('continue')"
        @click="submit"
        :disabled="!canSubmit"
        :primary="true"
      />
    </div>
  </core-modal>

</template>


<script>

  import bytesForHumans from '../bytesForHumans';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import driveList from './drive-list';
  import kButton from 'kolibri.coreVue.components.kButton';
  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import sumBy from 'lodash/sumBy';
  import uiAlert from 'keen-ui/src/UiAlert';
  import { transitionWizardPage } from '../../../state/actions/contentWizardActions';

  export default {
    name: 'wizardExport',
    $trs: {
      available: 'available',
      cancel: 'Cancel',
      continue: 'Continue',
      notWritable: 'Not writable',
      title: 'Select an export destination',
    },
    components: {
      coreModal,
      driveList,
      kButton,
      loadingSpinner,
      uiAlert,
    },
    data: () => ({ selectedDrive: '' }),
    computed: {
      drivesLoading() {
        return this.wizardState.driveList === null;
      },
      canSubmit() {
        return !this.drivesLoading && !this.wizardState.busy && this.selectedDrive !== '';
      },
      exportSize() {
        return bytesForHumans(sumBy(this.channelList, 'total_file_size'));
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
        channelList: ({ pageState }) => pageState.channelList,
        wizardState: ({ pageState }) => pageState.wizardState,
      },
      actions: {
        transitionWizardPage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $min-height = 200px

  .spinner
    height: $min-height

  .options
    margin: 2em 0
    min-height: $min-height


  .buttons
    text-align: right

</style>
