<template>

  <div class="drive-list">
    <div v-if="drives.length === 0">
      <h2 class="core-text-alert">
        <mat-svg class="error-svg" category="alert" name="error_outline"/>
        {{ $tr('noDrivesDetected') }}
      </h2>
    </div>

    <div v-else>
      <h2>{{ $tr('drivesFound') }}</h2>
      <k-radio
        v-for="drive in enabledDrives"
        :key="drive.id"
        :label="genEnabledDriveLabel(drive)"
        :radiovalue="drive.id"
        v-model="selectedDrive"
        @change="$emit('change', drive.id)"
      />
      <k-radio
        v-for="drive in disabledDrives"
        :key="drive.id"
        :label="genDisabledDriveLabel(drive)"
        :radiovalue="drive.id"
        :disabled="true"
        v-model="selectedDrive"
      />
    </div>
  </div>

</template>


<script>

  import kRadio from 'kolibri.coreVue.components.kRadio';

  export default {
    components: { kRadio },
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
    computed: {
      selectedDrive() {
        return this.value;
      },
      enabledDrives() {
        return this.drives.filter(drive => this.enabledDrivePred(drive));
      },
      disabledDrives() {
        return this.drives.filter(drive => !this.enabledDrivePred(drive));
      },
    },
    methods: {
      genEnabledDriveLabel(drive) {
        let driveLabel = drive.name;
        if (this.enabledMsg) {
          driveLabel += ` (${this.enabledMsg(drive)})`;
        }
        return driveLabel;
      },
      genDisabledDriveLabel(drive) {
        return `${drive.name} (${this.disabledMsg})`;
      },
    },
    name: 'wizardDriveList',
    $trs: {
      drivesFound: 'Drives found:',
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
