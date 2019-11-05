<template>

  <div
    class="channel-list-item"
    :class="{'channel-list-item-sm': windowIsSmall}"
    :style="[verticalPadding, { borderTop: `1px solid ${$themePalette.grey.v_200}` } ]"
  >
    <ChannelDetails
      :channel="channel"
      :versionNumber="versionNumber"
    >
      <template v-if="isPrivateChannel" v-slot:belowname>
        <KIcon
          class="lock-icon"
          icon="privatechannel"
        />
      </template>

      <template v-slot:abovedescription>
        <div v-if="inImportMode && onDevice" class="on-device">
          <KIcon
            class="check-icon"
            icon="correct"
            :style="{fill: $themeTokens.success}"
          />
          <span class="on-device-text">{{ $tr('onYourDevice') }}</span>
        </div>
      </template>

      <template v-if="newVersionAvailable" v-slot:belowdescription>
        <KIcon
          class="update-icon"
          icon="error"
          :style="{fill: $themeTokens.primary}"
        />
        {{ $tr('newVersionMessage') }}
        <KRouterLink :to="{}" :text="$tr('moreInformationLabel')" />
      </template>
    </ChannelDetails>

    <div class="col-3">
      <KRouterLink
        v-if="inImportMode || inExportMode"
        :text="$tr('selectTopicsAction')"
        :disabled="tasksInQueue"
        :to="selectContentLink"
        appearance="raised-button"
      />
    </div>

  </div>

</template>


<script>

  // ChannelPanel with Details, Select Topics Button
  // Private Channel Icon
  // Resources on Device Indicator
  import { mapGetters } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { selectContentPageLink } from '../manageContentLinks';
  import ChannelDetails from './ChannelDetails';

  const Modes = {
    IMPORT: 'IMPORT',
    EXPORT: 'EXPORT',
    MANAGE: 'MANAGE',
  };

  export default {
    name: 'WithImportDetails',
    components: {
      ChannelDetails,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
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
      inImportMode() {
        return this.mode === Modes.IMPORT;
      },
      inExportMode() {
        return this.mode === Modes.EXPORT;
      },
      isPrivateChannel() {
        // This is only defined when entering a remote import workflow,
        // so false !== undefined.
        return this.channel.public === false;
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
      newVersionAvailable() {
        return this.versionNumber < this.channel.latest_version;
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
    },
    $trs: {
      onYourDevice: 'Resources on device',
      selectTopicsAction: 'Select topics',
      /* eslint-disable */
      newLabel: 'New',
      privateChannelTooltip: 'Imported from channel token',
      newVersionMessage: 'New version available with import.',
      moreInformationLabel: 'More information',
      /* eslint-enable */
    },
  };

</script>


<style lang="scss" scoped>

  .channel-list-item {
    display: flex;
    padding: 32px 0;
  }

  .channel-list-item-sm {
    flex-direction: column;
    padding: 16px 0;
  }

  svg.lock-icon {
    width: 24px;
    height: 24px;

    .channel-list-item-sm & {
      width: 20px;
      height: 20px;
    }
  }

  .update-icon {
    margin-bottom: -1px;
  }

  .check-icon {
    margin-bottom: 3px;
  }

  .col-2 {
    min-width: 80px;
    margin-right: 16px;
    text-align: right;

    .channel-list-item-sm & {
      align-self: flex-end;
      order: -1;
      margin-right: 0;
    }
  }

  .col-3 {
    display: flex;
    align-items: center;

    .channel-list-item-sm & {
      flex-direction: column;
      align-items: flex-end;
      margin-top: 16px;
    }
  }

  .on-device {
    display: flex;
    align-items: center;
    margin: 8px 0;

    .channel-list-item-sm & {
      font-size: 0.85rem;
    }
  }

  .on-device-text {
    margin-left: 8px;
  }

</style>
