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
      <div
        :name="'drive-'+index"
        @click="$emit('change', drive.id)"
        class="drive-list-item drive-list-item-enabled"
        v-for="(drive, index) in enabledDrives"
      >
        <ui-radio
          :id="'drive-'+index"
          :trueValue="drive.id"
          v-model="selectedDrive"
        >
          <div class="drive-name">{{ drive.name }}</div>
          <div v-if="enabledMsg" class="drive-list-item-detail">
            {{ enabledMsg(drive) }}
          </div>
        </ui-radio>
      </div>

      <div class="drive-list-item drive-list-item-disabled" v-for="(drive, index) in disabledDrives">
        <ui-radio
          :id="'disabled-drive-'+index"
          :trueValue="drive.id"
          disabled
          v-model="selectedDrive"
        >
          <div>{{ drive.name }}</div>
          <div class="drive-list-item-detail">
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
      // function that creates a message for enabled drives, takes the drive object as argument
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

  .drive-list
    &:not(first-child)
      border-top: none

  .drive-list-item
    padding: 0.6em
    font-size: 0.9em
    border: 1px $core-bg-canvas solid
    &-detail
      color: $core-text-annotation
      font-size: 0.7em
    &-disabled
      color: $core-text-disabled
    &-enabled
      cursor: pointer
      &:hover
        background-color: $core-bg-canvas

  .drive-name
    font-size: 0.9em
    & > label
      cursor: pointer

</style>
