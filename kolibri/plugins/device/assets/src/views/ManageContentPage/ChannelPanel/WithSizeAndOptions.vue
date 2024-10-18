<template>

  <div
    class="panel"
    :class="{ 'panel-sm': windowIsSmall }"
    :style="{ borderTop: `1px solid ${$themeTokens.fineLine}` }"
  >
    <ChannelDetails :channel="channel">
      <template #belowname>
        <div class="private-icons">
          <KTooltip
            reference="lockicon"
            :refs="$refs"
            placement="top"
          >
            {{ deviceString('unlistedChannelLabel') }}
          </KTooltip>
          <KIcon
            v-if="channel.public === false"
            ref="lockicon"
            class="lock-icon"
            icon="unlistedchannel"
          />
          <NewBadge
            v-if="showNewLabel"
            :label="$tr('updatedResourcesLabel')"
            class="new-label"
          />
        </div>
      </template>
    </ChannelDetails>

    <div
      class="col-2"
      dir="auto"
      data-test="resources-size"
    >
      {{ resourcesSizeText }}
    </div>

    <div class="col-3">
      <KButton
        :text="$tr('manageChannelAction')"
        :disabled="disabled"
        @click="handleManageChannelAction"
      />
    </div>
  </div>

</template>


<script>

  // ChannelPanel with Details, On-Device Size, and Options Dropdown

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import NewBadge from '../NewBadge';
  import commonDeviceStrings from '../../commonDeviceStrings';
  import ChannelDetails from './ChannelDetails';

  export default {
    name: 'WithSizeAndOptions',
    components: {
      ChannelDetails,
      NewBadge,
    },
    mixins: [commonCoreStrings, commonDeviceStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      showNewLabel: {
        type: Boolean,
        required: false,
      },
    },
    computed: {
      resourcesSizeText() {
        return bytesForHumans(this.channel.on_device_file_size);
      },
    },
    methods: {
      handleManageChannelAction() {
        return this.$emit('select_manage', { ...this.channel });
      },
    },
    $trs: {
      manageChannelAction: {
        message: 'Manage',
        context: "Operation that can be performed on a channel. Refers to the 'Manage' button.",
      },
      updatedResourcesLabel: {
        message: 'Resources recently updated',
        context: 'Label for channels that contain recently updated resources.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .panel {
    display: flex;
    padding: 32px 0;
  }

  .panel-sm {
    flex-direction: column;
    padding: 16px 0;
  }

  svg.lock-icon {
    width: 24px;
    height: 24px;

    .panel-sm & {
      width: 20px;
      height: 20px;
    }
  }

  .col-2 {
    min-width: 80px;
    margin-right: 16px;
    text-align: right;

    .panel-sm & {
      font-size: 14px;
      text-align: left;
    }
  }

  .col-3 {
    margin-top: -8px;

    .panel-sm & {
      margin-top: 16px;
      text-align: right;
    }
  }

  .private-icons {
    position: relative;
    display: inline-block;
    margin-top: -3px;
    margin-bottom: 3px;
    vertical-align: top;

    .panel-sm & {
      margin-top: -1px;
      margin-bottom: 1px;
    }
  }

  .new-label {
    position: relative;
    top: 5px;
    display: inline-block;

    .panel-sm & {
      top: 2px;
      margin-left: 0;
    }
  }

</style>
