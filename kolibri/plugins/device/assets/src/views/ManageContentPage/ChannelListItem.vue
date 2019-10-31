<template>

  <div
    class="channel-list-item"
    :class="{'channel-list-item-sm': windowIsSmall}"
    :style="[verticalPadding, { borderTop: `1px solid ${$themePalette.grey.v_200}` } ]"
  >
    <ChannelDetailPanel
      :channel="channel"
      :versionNumber="versionNumber"
    >
      <template v-slot:belowname>
        <UiIcon v-if="isPrivateChannel" class="icon">
          <mat-svg name="lock_open" category="action" />
        </UiIcon>
      </template>

      <template v-slot:abovedescription>
        <div v-if="inImportMode && onDevice" class="on-device">
          <UiIcon class="icon">
            <mat-svg
              category="action"
              name="check_circle"
              :style="{ fill: $themeTokens.success }"
            />
          </UiIcon>
          <span class="on-device-text">{{ $tr('onYourDevice') }}</span>
        </div>
      </template>

      <template v-slot:belowdescription>
        <CoachContentLabel
          :value="channel.num_coach_contents"
          :isTopic="true"
        />
      </template>
    </ChannelDetailPanel>

    <div class="col-2">
      <div v-if="inExportMode || inManageMode" dir="auto" class="spec-ref-resources-size">
        {{ resourcesSizeText }}
      </div>
    </div>

    <div class="col-3">
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
    </div>

  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import UiIcon from 'keen-ui/src/UiIcon';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { selectContentPageLink } from './manageContentLinks';
  import ChannelDetailPanel from './ChannelDetailPanel';

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
      ChannelDetailPanel,
      UiIcon,
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
      manageChannelActions() {
        return [
          {
            label: this.$tr('importMoreFromChannel'),
            value: ChannelActions.IMPORT_MORE_FROM_CHANNEL,
          },
          {
            label: this.$tr('deleteChannelAction'),
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
      importMoreFromChannel: 'Import more',
      deleteChannelAction: 'Delete channel',
      onYourDevice: 'On your device',
      selectButton: 'Select',
    },
  };

</script>


<style lang="scss" scoped>

  .channel-list-item {
    display: flex;
    padding: 16px;
  }

  .channel-list-item-sm {
    flex-direction: column;

    .col-3 {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-top: 16px;
    }

    .col-2 {
      align-self: flex-end;
      order: -1;
      margin-right: 0;
    }

    .on-device {
      font-size: 0.85rem;
    }
  }

  .col-2 {
    min-width: 80px;
    margin-right: 16px;
    text-align: right;
  }

  .col-3 {
    // raises button to align better with other test
    margin-top: -8px;
  }

  .on-device {
    display: flex;
    align-items: center;
    margin: 8px 0;
  }

  .on-device-text {
    margin-left: 8px;
  }

</style>
