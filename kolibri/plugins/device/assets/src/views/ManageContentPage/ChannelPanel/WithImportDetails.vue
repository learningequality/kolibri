<template>

  <div
    class="channel-list-item"
    :class="{'channel-list-item-sm': windowIsSmall}"
    :style="[verticalPadding, { borderTop: `1px solid ${$themePalette.grey.v_200}` } ]"
  >
    <ChannelDetails
      :channel="channel"
      :channelVersion="versionNumber"
    >
      <template v-if="multipleMode" v-slot:beforethumbnail>
        <KCheckbox
          class="checkbox"
          :label="channel.name"
          :showLabel="false"
          :checked="$attrs.checked"
          @change="$emit('checkboxchange', { channel: channel, isSelected: $event })"
        />
      </template>

      <template v-if="isUnlistedChannel" v-slot:belowname>
        <KTooltip reference="lockicon" :refs="$refs" placement="top">
          {{ $tr('unlistedChannelTooltip') }}
        </KTooltip>
        <div class="private-icons">
          <KIcon
            ref="lockicon"
            class="lock-icon"
            icon="unlistedchannel"
          /><span
            v-if="channel.newUnlistedChannel"
            class="new-label"
            :style="{
              color: $themeTokens.textInverted,
              backgroundColor: $themeTokens.success
            }"
          >{{ $tr('newLabel') }}</span>
        </div>
      </template>

      <template v-slot:abovedescription>
        <div v-if="newVersionAvailable">
          <KIcon
            class="update-icon"
            icon="error"
            :style="{fill: $themeTokens.primary}"
          />
          {{ $tr('newVersionMessage') }}
          <KRouterLink :to="newChannelVersionPageRoute" :text="$tr('moreInformationLabel')" />
        </div>
        <div v-if="onDevice" class="on-device">
          <KIcon
            class="check-icon"
            icon="correct"
            :style="{fill: $themeTokens.success}"
          />
          <span class="on-device-text">{{ $tr('onYourDevice') }}</span>
        </div>
      </template>

      <template v-slot:append>
        <div class="col-3">
          <p v-if="multipleMode && $attrs.checked" class="selected-msg">
            {{ channelSelectedMessage }}
          </p>
          <KRouterLink
            v-if="!multipleMode"
            :text="$tr('selectResourcesAction')"
            :to="selectContentLink"
            appearance="raised-button"
          />
        </div>
      </template>
    </ChannelDetails>


  </div>

</template>


<script>

  // ChannelPanel with Details, Select Topics Button
  // Private Channel Icon
  // Resources on Device Indicator
  import { mapGetters } from 'vuex';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { selectContentPageLink } from '../manageContentLinks';
  import { PageNames } from '../../../constants';
  import ChannelDetails from './ChannelDetails';

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
      onDevice: {
        type: Boolean,
        default: false,
      },
      multipleMode: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('manageContent', ['channelIsInstalled']),
      channelSelectedMessage() {
        // Can't show file sizes when importing from drive
        if (this.channel.total_file_size) {
          return this.$tr('channelSelectedWithFileSize', {
            bytesText: this.bytesForHumans(this.channel.total_file_size),
          });
        } else {
          return this.$tr('channelSelectedNoFileSize');
        }
      },
      isUnlistedChannel() {
        return this.channel.public === false;
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
      newChannelVersionPageRoute() {
        return {
          name: PageNames.NEW_CHANNEL_VERSION_PAGE,
          params: {
            channel_id: this.channel.id,
          },
          query: {
            ...this.$route.query,
            last: PageNames.AVAILABLE_CHANNELS_PAGE,
          },
        };
      },
      selectContentLink() {
        return selectContentPageLink({
          addressId: this.$route.query.address_id,
          channelId: this.channel.id,
          driveId: this.$route.query.drive_id,
        });
      },
      verticalPadding() {
        return {
          paddingBottom: `${this.windowGutter}px`,
          paddingTop: `${this.windowGutter}px`,
        };
      },
    },
    methods: {
      bytesForHumans,
    },
    $trs: {
      onYourDevice: 'Resources on device',
      selectResourcesAction: 'Select resources',
      newLabel: {
        message: 'New',
        context: '\nIndicator that channel was recently updated, imported, and unlocked',
      },
      unlistedChannelTooltip: 'Unlisted channel',
      newVersionMessage: 'New version available',
      moreInformationLabel: 'More information',
      channelSelectedNoFileSize: 'Selected',
      channelSelectedWithFileSize: '{bytesText} selected',
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

  .private-icons {
    position: relative;
    display: inline-block;
    margin-top: -3px;
    margin-bottom: 3px;
    vertical-align: top;
  }

  .new-label {
    position: absolute;
    top: 2px;
    display: inline-block;
    padding: 2px 8px;
    margin-left: 8px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 2px;

    .channel-list-item-sm & {
      top: -2px;
    }
  }

  .selected-msg {
    align-self: flex-start;
    min-width: 150px;
    margin: 0;
    text-align: right;

    .channel-list-item-sm & {
      align-self: flex-end;
      margin: 8px 0;
      font-size: 14px;
    }
  }

</style>
