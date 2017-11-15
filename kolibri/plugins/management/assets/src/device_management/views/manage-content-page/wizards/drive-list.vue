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
        v-for="drive in drives"
        :key="drive.id"
        :label="enabledDriveLabel(drive)"
        :radiovalue="drive.id"
        :value="value"
        @change="$emit('input', drive.id)"
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
      drives: {
        type: Array,
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        selectedDrive: '',
      };
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
      // TODO add message for export and import modes, explaining what counts as a valid drive
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
