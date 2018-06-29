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
            <span dir="auto">{{ resourcesSizeText }}</span>
          </div>
        </div>
        <div class="channel-title">
          <div class="title" dir="auto">
            {{ channel.name }}
          </div>
          <ui-icon
            class="lock-icon"
            v-if="channel.public === false"
          >
            <mat-svg name="lock_open" category="action" />
          </ui-icon>
        </div>
        <div class="version">
          {{ $tr('version', { version: versionNumber }) }}
        </div>
      </div>

      <div class="details-bottom">
        <div class="description" dir="auto">
          {{ channel.description || $tr('defaultDescription') }}
        </div>

        <coach-content-label
          :value="channel.num_coach_contents"
          :isTopic="true"
        />
      </div>

    </div>

    <div class="buttons dtc">
      <k-router-link
        v-if="inImportMode || inExportMode"
        :text="$tr('selectButton')"
        :disabled="tasksInQueue"
        :to="selectContentLink"
        appearance="raised-button"
      />
      <k-dropdown-menu
        v-if="inManageMode"
        :text="$tr('manageChannelActions')"
        :disabled="tasksInQueue"
        :options="manageChannelActions"
        @select="handleManageChannelAction($event.value)"
      />
    </div>
  </div>

</template>


<script>

  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kDropdownMenu from 'kolibri.coreVue.components.kDropdownMenu';
  import UiIcon from 'keen-ui/src/UiIcon';
  import { channelIsInstalled } from '../../state/getters';
  import bytesForHumans from './bytesForHumans';
  import { selectContentPageLink } from './manageContentLinks';

  const Modes = {
    IMPORT: 'IMPORT',
    EXPORT: 'EXPORT',
    MANAGE: 'MANAGE',
  };

  const ChannelActions = {
    DELETE_CHANNEL: 'DELETE_CHANNEL',
    IMPORT_MORE_FROM_CHANNEL: 'IMPORT_MORE_FROM_CHANNEL',
  };

  export default {
    name: 'channelListItem',
    components: {
      coachContentLabel,
      kDropdownMenu,
      kRouterLink,
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
      manageChannelActions() {
        return [
          {
            label: this.$tr('importMoreFromChannel'),
            value: ChannelActions.IMPORT_MORE_FROM_CHANNEL,
          },
          {
            label: this.$tr('deleteChannel'),
            value: ChannelActions.DELETE_CHANNEL,
          },
        ];
      },
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
      selectContentLink() {
        return selectContentPageLink({
          channelId: this.channel.id,
          driveId: this.$route.query.drive_id,
          forExport: this.$route.query.for_export,
        });
      },
    },
    methods: {
      handleManageChannelAction(action) {
        if (action === ChannelActions.DELETE_CHANNEL) {
          return this.$emit('clickdelete');
        }
        return this.$emit('import_more', { ...this.channel });
      },
    },
    vuex: {
      getters: {
        pageState: ({ pageState }) => pageState,
        channelIsInstalled,
      },
    },
    $trs: {
      defaultDescription: '(No description)',
      deleteChannel: 'Delete',
      importMoreFromChannel: 'Import more',
      manageChannelActions: 'Actions',
      onYourDevice: 'On your device',
      selectButton: 'Select',
      version: 'Version {version}',
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
