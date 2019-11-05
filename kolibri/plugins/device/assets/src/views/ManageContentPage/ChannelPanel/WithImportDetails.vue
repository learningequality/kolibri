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
      <template v-if="multipleMode" v-slot:beforethumbnail>
        <KCheckbox
          class="checkbox"
          :label="channel.name"
          :showLabel="false"
          :checked="$attrs.checked"
          @change="$emit('checkboxchange', { channel: channel, isSelected: $event })"
        />
      </template>

      <template v-if="isPrivateChannel" v-slot:belowname>
        <KTooltip reference="lockicon" :refs="$refs" placement="right">
          {{ $tr('privateChannelTooltip') }}
        </KTooltip>
        <div class="private-icons">
          <KIcon
            ref="lockicon"
            class="lock-icon"
            icon="privatechannel"
          /><span
            v-if="channel.newPrivateChannel"
            class="new-label"
            :style="{
              color: $themeTokens.textInverted,
              backgroundColor: $themeTokens.success
            }"
          >{{ $tr('newLabel') }}</span>
        </div>
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
      <p v-if="multipleMode && $attrs.checked" class="selected-msg">
        {{ deviceStrings.$tr('channelSelectedMessage', {
          bytesText: bytesForHumans(channel.total_file_size)
        }) }}
      </p>
      <KRouterLink
        v-if="(inImportMode || inExportMode) && !multipleMode"
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
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { selectContentPageLink } from '../manageContentLinks';
  import deviceStrings from '../../commonDeviceStrings';
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
      multipleMode: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('manageContent', ['channelIsInstalled', 'activeTaskList']),
      deviceStrings() {
        return deviceStrings;
      },
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
    methods: {
      bytesForHumans,
    },
    $trs: {
      onYourDevice: 'Resources on device',
      selectTopicsAction: 'Select topics',
      newLabel: 'New',
      privateChannelTooltip: 'Imported from channel token',
      newVersionMessage: 'New version available with import.',
      moreInformationLabel: 'More information',
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

  .new-label {
    position: absolute;
    top: 3px;
    padding: 2px 5px 2px 4px;
    margin-left: 8px;
    font-size: 14px;
    border-radius: 2px;
  }

  .private-icons {
    position: relative;
    display: inline-block;
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
