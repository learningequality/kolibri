<template>
  <div class="DriveList">
    <div v-if="drives.length === 0">
      <h2 class="core-text-alert">
        <mat-svg class="error-svg" category="alert" name="error_outline"/>
        {{ $tr('noDrivesDetected') }}
      </h2>
    </div>

    <div>
      <h2>{{ $tr('drivesFound') }}</h2>
      <div
        :name="'drive-'+index"
        @click="$emit('change', drive.id)"
        class="DriveName DriveName--enabled"
        v-for="(drive, index) in enabledDrives"
      >
        <ui-radio
          :id="'drive-'+index"
          :trueValue="drive.id"
          v-model="selectedDrive"
        >
          <div>{{ drive.name }}</div>
          <div v-if="enabledMsg" class="DriveName__detail">
            {{ enabledMsg(drive) }}
          </div>
        </ui-radio>
      </div>

      <div class="DriveName DriveName--disabled" v-for="(drive, index) in disabledDrives">
        <ui-radio
          :id="'disabled-drive-'+index"
          :trueValue="drive.id"
          disabled
          v-model="selectedDrive"
        >
          <div>{{ drive.name }}</div>
          <div class="DriveName__detail">
            {{ disabledMsg }}
          </div>
        </ui-radio>
      </div>

    </div>
  </div>
</template>


<script>

  module.exports = {
    components: {
      UiRadio: require('keen-ui/src/UiRadio'),
    },
    props: {
      value: { type: String, required: true },
      drives: { type: Array, required: true },
      // function that partitions drive list in to enabled/disabled
      enabledDrivePred: { type: Function, required: true },
      // function that creates a message for enabled drives
      enabledMsg: { type: Function },
      // hard-coded string for disabled drives
      disabledMsg: { type: String, required: true },
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
    $trNameSpace: 'wizardDriveList',
    $trs: {
      drivesFound: 'Drives found:',
      noDrivesDetected: 'No drives were detected',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  h2
    font-size: 1em

  .DriveList
    &:not(first-child)
      border-top: none

  .DriveName
    padding: 0.6em
    border: 1px $core-bg-canvas solid
    &__detail
      color: $core-text-annotation
      font-size: 0.7em
    &--disabled
      color: $core-text-disabled
    &--enabled
      cursor: pointer
      &:hover
        background-color: $core-bg-canvas

  .DriveName > label
    cursor: pointer
    font-size: 0.9em

</style>
