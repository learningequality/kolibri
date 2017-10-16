<template>

  <div class="drive-list">
    <div v-if="drives.length === 0">
      <h2 class="core-text-alert">
        <mat-svg class="error-svg" category="alert" name="error_outline" />
        {{ $tr('noDrivesDetected') }}
      </h2>
    </div>

    <div v-else>
      <h2>{{ $tr('drivesFound') }}</h2>
      <k-radio-button
        v-for="drive in enabledDrives"
        :key="drive.id"
        :label="enabledDriveLabel(drive)"
        :radiovalue="drive.id"
        v-model="selectedDrive"
        @change="$emit('change', drive.id)"
      />
      <k-radio-button
        v-for="drive in disabledDrives"
        :key="drive.id"
        :label="disabledDriveLabel(drive)"
        :radiovalue="drive.id"
        :disabled="true"
        v-model="selectedDrive"
      />
    </div>
  </div>

</template>


<script>

  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';

  export default {
    name: 'wizardDriveList',
    components: { kRadioButton },
    props: {
      value: {
        type: String,
        required: true,
      },
      drives: {
        type: Array,
        required: true,
      },
      enabledDrivePred: {
        type: Function,
        required: true,
      },
      enabledMsg: { type: Function },
      disabledMsg: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        selectedDrive: '',
      };
    },
    computed: {
      enabledDrives() {
        return this.drives.filter(drive => this.enabledDrivePred(drive));
      },
      disabledDrives() {
        return this.drives.filter(drive => !this.enabledDrivePred(drive));
      },
    },
    mounted() {
      this.selectedDrive = this.value;
    },
    methods: {
      enabledDriveLabel(drive) {
        let driveLabel = drive.name;
        if (this.enabledMsg) {
          driveLabel += ` (${this.enabledMsg(drive)})`;
        }
        return driveLabel;
      },
      disabledDriveLabel(drive) {
        return `${drive.name} (${this.disabledMsg})`;
      },
    },
    $trs: {
      drivesFound: 'Drives found',
      noDrivesDetected: 'No drives were detected',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .error-svg
    margin-right: 0.2em
    margin-bottom: -6px

  h2
    font-size: 1em

</style>
