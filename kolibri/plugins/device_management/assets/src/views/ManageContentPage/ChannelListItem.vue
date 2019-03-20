<template>

  <component
    :is="componentTemplate"
    class="channel-list-item"
    :style="[verticalPadding, { borderTop: `1px solid ${$coreGrey}` } ]"
  >
    <template slot="thumbnail">
      <div class="spec-ref-thumbnail">
        <img v-if="thumbnailImg" :src="thumbnailImg" class="thumbnail">
        <div v-else class="default-icon" :style="{ backgroundColor: $coreGrey }">
          <mat-svg category="navigation" name="apps" />
        </div>
      </div>
    </template>

    <template slot="header">
      <div>
        <h2 class="title" dir="auto">{{ channel.name }}</h2>
        <UiIcon v-if="isPrivateChannel" class="icon">
          <mat-svg name="lock_open" category="action" />
        </UiIcon>
      </div>
      <div class="version" :style="{ color: $coreTextAnnotation }">
        {{ $tr('version', { version: versionNumber }) }}
      </div>
    </template>

    <template slot="meta">
      <div v-if="inImportMode && onDevice" class="spec-ref-on-device">
        <UiIcon class="icon">
          <mat-svg
            category="action"
            name="check_circle"
            :style="{ fill: $coreStatusCorrect }"
          />
        </UiIcon>
        <span class="on-device-text">{{ $tr('onYourDevice') }}</span>
      </div>
      <div v-if="inExportMode || inManageMode" dir="auto" class="spec-ref-resources-size">
        {{ resourcesSizeText }}
      </div>
    </template>

    <template slot="description">
      <p dir="auto" class="spec-ref-description">
        {{ channel.description || $tr('defaultDescription') }}
      </p>
      <CoachContentLabel
        :value="channel.num_coach_contents"
        :isTopic="true"
      />
    </template>

    <template slot="buttons">
      <KRouterLink
        v-if="inImportMode || inExportMode"
        :text="$tr('selectButton')"
        :disabled="tasksInQueue"
        :to="selectContentLink"
        appearance="raised-button"
      />
      <KDropdownMenu
        v-if="inManageMode"
        :text="$tr('manageChannelOptions')"
        :disabled="tasksInQueue"
        :options="manageChannelActions"
        @select="handleManageChannelAction($event.value)"
      />
    </template>
  </component>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import UiIcon from 'keen-ui/src/UiIcon';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import { selectContentPageLink } from './manageContentLinks';
  import ChannelListItemLarge from './ChannelListItemLarge';
  import ChannelListItemSmall from './ChannelListItemSmall';

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
    name: 'ChannelListItem',
    components: {
      CoachContentLabel,
      KDropdownMenu,
      KRouterLink,
      UiIcon,
    },
    mixins: [responsiveWindow, themeMixin],
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
      ...mapGetters('manageContent', ['channelIsInstalled']),
      ...mapState('manageContent', ['taskList']),
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
      isPrivateChannel() {
        // This is only defined when entering a remote import workflow,
        // so false !== undefined.
        return this.channel.public === false;
      },
      resourcesSizeText() {
        return bytesForHumans(this.channel.on_device_file_size);
      },
      thumbnailImg() {
        return this.channel.thumbnail;
      },
      tasksInQueue() {
        return this.taskList.length > 0;
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
          addressId: this.$route.query.address_id,
          channelId: this.channel.id,
          driveId: this.$route.query.drive_id,
          forExport: this.$route.query.for_export,
        });
      },
      verticalPadding() {
        return {
          paddingBottom: `${this.windowGutter}px`,
          paddingTop: `${this.windowGutter}px`,
        };
      },
      componentTemplate() {
        if (this.windowIsLarge) {
          return ChannelListItemLarge;
        }
        return ChannelListItemSmall;
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
    $trs: {
      defaultDescription: '(No description)',
      deleteChannel: 'Delete',
      importMoreFromChannel: 'Import more',
      manageChannelOptions: 'Options',
      onYourDevice: 'On your device',
      selectButton: 'Select',
      version: 'Version {version}',
      channelNotAvailable: 'This channel is no longer available',
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    display: inline;
  }

  .version {
    font-size: 0.85em;
  }

  .thumbnail {
    width: 100%;
  }

  .default-icon {
    text-align: center;
    svg {
      width: 30%;
      height: 30%;
      margin: 20px;
    }
  }

  .on-device-text {
    margin-left: 8px;
  }

  .icon {
    vertical-align: text-bottom;
  }

</style>
