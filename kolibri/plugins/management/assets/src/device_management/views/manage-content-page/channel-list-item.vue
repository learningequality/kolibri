<template>

  <div class="channel-list-item">

    <div class="thumbnail dtc">
      <img
        v-if="thumbnailImg"
        :src="thumbnailImg"
      >
      <div
        v-else
        class="default-icon"
      >
        <mat-svg
          category="navigation"
          name="apps"
        />
      </div>
    </div>

    <div class="details dtc">

      <div class="details-top">
        <div class="other-details">
          <div
            v-if="inImportMode && onDevice"
            class="on-device"
          >
            <mat-svg
              category="action"
              name="check_circle"
            />
            <span>{{ $tr('onYourDevice') }}</span>
          </div>
          <div
            v-if="inExportMode || inManageMode"
            class="resources-size"
          >
            <span>{{ resourcesSizeText }}</span>
          </div>
        </div>
        <div class="channel-title">
          <div class="title">
            {{ channel.name }}
          </div>
          <ui-icon
            class="lock-icon"
            v-if="channel.public === false"
            icon="lock_open"
          />
        </div>
        <div class="version">
          {{ $tr('version', { version: versionNumber }) }}
        </div>
      </div>

      <div class="details-bottom">
        <div class="description">
          {{ channel.description || $tr('defaultDescription') }}
        </div>
      </div>

    </div>

    <div class="buttons dtc">
      <k-button
        v-if="inImportMode || inExportMode"
        @click="$emit('clickselect')"
        name="select"
        :text="$tr('selectButton')"
        primary
        :disabled="tasksInQueue"
      />
      <k-button
        v-if="inManageMode"
        @click="$emit('clickdelete')"
        name="delete"
        :text="$tr('deleteButton')"
        :disabled="tasksInQueue"
      />
    </div>
  </div>

</template>


<script>

  import bytesForHumans from './bytesForHumans';
  import { channelIsInstalled } from '../../state/getters';
  import kButton from 'kolibri.coreVue.components.kButton';
  import UiIcon from 'keen-ui/src/UiIcon';

  const Modes = {
    IMPORT: 'IMPORT',
    EXPORT: 'EXPORT',
    MANAGE: 'MANAGE',
  };

  export default {
    name: 'channelListItem',
    components: {
      kButton,
      UiIcon,
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
      mode: {
        type: String, // 'IMPORT' | 'EXPORT' | 'MANAGE'
        required: true,
        validator(val) {
          return Object.keys(Modes).includes(val);
        },
      },
      onDevice: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      inImportMode() {
        return this.mode === Modes.IMPORT;
      },
      inExportMode() {
        return this.mode === Modes.EXPORT;
      },
      inManageMode() {
        return this.mode === Modes.MANAGE;
      },
      resourcesSizeText() {
        return bytesForHumans(this.channel.on_device_file_size);
      },
      thumbnailImg() {
        return this.channel.thumbnail;
      },
      tasksInQueue() {
        const { taskList = [] } = this.pageState;
        return taskList.length > 0;
      },
      versionNumber() {
        const installed = this.channelIsInstalled(this.channel.id);
        if (installed) {
          return installed.version;
        }
        return this.channel.version;
      },
    },
    vuex: {
      getters: {
        pageState: ({ pageState }) => pageState,
        channelIsInstalled,
      },
    },
    $trs: {
      deleteButton: 'Delete',
      onYourDevice: 'On your device',
      selectButton: 'Select',
      version: 'Version {version}',
      defaultDescription: '(No description)',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .dtc
    display: table-cell
    vertical-align: top

  .channel-list-item
    display: table
    vertical-align: middle
    padding: 2em 0
    border-bottom: 1px solid $core-grey

  .title
    font-size: 1.2em
    font-weight: bold
    line-height: 1.5em
    display: inline

  .version
    font-size: 0.85em
    color: $core-text-annotation

  .description
    width: 66%
    padding: 1em 0

  .thumbnail
    width: 10%
    text-align: left
    img
      width: 100%

  .default-icon
    background-color: $core-grey
    text-align: center
    svg
      width: 50%
      height: 50%
      margin: 20px

  .details
    width: 100%
    position: relative
    padding: 0 2em

  .other-details
    float: right
    line-height: 1.7em
    position: relative
    top: 16px

  .on-device
    line-height: 1.7em
    svg
      fill: $core-status-correct
    span
      margin-left: 10px
      vertical-align: top

  .buttons
    width: 10%
    text-align: right
    vertical-align: baseline

  .lock-icon
    vertical-align: sub

  .channel-title
    margin-bottom: 8px

</style>
