<template>

  <component
    :is="componentTemplate"
    class="channel-list-item"
    :style="[verticalPadding, { borderTop: `1px solid ${$themePalette.grey.v_200}` } ]"
  >
    <template slot="thumbnail">
      <div class="thumbnail-container" data-test="thumbnail">
        <img
          v-if="thumbnailImg"
          :src="thumbnailImg"
          class="thumbnail"
        >
        <div
          v-else
          class="default-icon"
          :style="{ backgroundColor: $themePalette.grey.v_200 }"
        >
          <mat-svg category="navigation" name="apps" />
        </div>
      </div>
    </template>

    <template slot="header">
      <div>
        <h2 class="title" dir="auto">
          {{ channel.name }}
        </h2>
        <UiIcon v-if="isPrivateChannel" class="icon">
          <mat-svg name="lock_open" category="action" />
        </UiIcon>
      </div>
      <div class="version" :style="{ color: $themeTokens.annotation }">
        {{ $tr('version', { version: versionNumber }) }}
      </div>
    </template>

    <template slot="meta">
      <div v-if="inImportMode && onDevice" class="spec-ref-on-device">
        <UiIcon class="icon">
          <mat-svg
            category="action"
            name="check_circle"
            :style="{ fill: $themeTokens.success }"
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
        :text="coreString('optionsLabel')"
        :disabled="tasksInQueue"
        :options="manageChannelActions"
        @select="handleManageChannelAction($event.value)"
      />
    </template>
  </component>

</template>


<script>

  import { mapGetters } from 'vuex';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import UiIcon from 'keen-ui/src/UiIcon';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
      UiIcon,
    },
    mixins: [commonCoreStrings, KResponsiveWindowMixin],
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
      ...mapGetters('manageContent', ['channelIsInstalled', 'activeTaskList']),
      manageChannelActions() {
        return [
          {
            label: this.$tr('importMoreFromChannel'),
            value: ChannelActions.IMPORT_MORE_FROM_CHANNEL,
          },
          {
            label: this.coreString('deleteAction'),
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
        return this.activeTaskList.length > 0;
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
      importMoreFromChannel: 'Import more',
      onYourDevice: 'On your device',
      selectButton: 'Select',
      version: 'Version {version}',
    },
  };

</script>


<style lang="scss" scoped>

  $thumbnail-side-length: 128px;

  .title {
    display: inline;
  }

  .version {
    font-size: 0.85em;
  }

  .thumbnail-container {
    width: $thumbnail-side-length;
    height: $thumbnail-side-length;
  }

  .thumbnail {
    width: 100%;
  }

  .default-icon {
    width: 100%;
    height: 100%;
    text-align: center;
    svg {
      width: 50%;
      height: 50%;
      // Icon scaled to 0.5 of 128px = 64px, so midpoint need to be moved to 128 / 4 = 32 px
      margin: ($thumbnail-side-length / 2 / 2) 0;
    }
  }

  .on-device-text {
    margin-left: 8px;
  }

  .icon {
    vertical-align: text-bottom;
  }

</style>
