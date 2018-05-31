<template>

  <div class="drive-list">
    <div v-if="drives.length === 0">
      <ui-alert
        type="info"
        :dismissible="false"
      >
        {{ noDrivesText }}
      </ui-alert>
    </div>

    <div v-else>
      <h2>{{ $tr('drivesFound') }}</h2>
      <k-radio-button
        v-for="drive in drives"
        :key="drive.id"
        :label="enabledDriveLabel(drive)"
        :value="drive.id"
        :currentValue="value"
        @change="$emit('input', drive.id)"
      />
    </div>
  </div>

</template>


<script>

  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import UiAlert from 'keen-ui/src/UiAlert';

  export default {
    name: 'driveList',
    components: {
      kRadioButton,
      UiAlert,
    },
    props: {
      drives: {
        type: Array,
        required: true,
      },
      mode: {
        type: String,
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
    computed: {
      noDrivesText() {
        if (this.mode === 'IMPORT') {
          return this.$tr('noImportableDrives');
        } else if (this.mode === 'IMPORT_MORE') {
          return this.$tr('noDriveWithSelectedChannelError');
        }
        return this.$tr('noExportableDrives');
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
      noImportableDrives: 'No drives with Kolibri content are connected to the server',
      noDriveWithSelectedChannelError:
        'No drives with the selected channel are connected to the server',
      noExportableDrives: 'No drives that can be written to are connected to the server',
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
