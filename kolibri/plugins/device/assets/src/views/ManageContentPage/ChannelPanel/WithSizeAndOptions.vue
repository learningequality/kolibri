<template>

  <div
    class="panel"
    :class="{'panel-sm': windowIsSmall}"
    :style="{ borderTop: `1px solid ${$themePalette.grey.v_200}` }"
  >
    <ChannelDetails :channel="channel">

      <template v-slot:belowname>
        <div class="private-icons">
          <KTooltip reference="lockicon" :refs="$refs" placement="top">
            {{ WithImportDetailsStrings.$tr('unlistedChannelTooltip') }}
          </KTooltip>
          <KIcon
            v-if="channel.public === false"
            ref="lockicon"
            class="lock-icon"
            icon="unlistedchannel"
          />
          <span
            v-if="showNewLabel"
            class="new-label"
            :style="{
              color: $themeTokens.textInverted,
              backgroundColor: $themeTokens.success
            }"
          >{{ WithImportDetailsStrings.$tr('newLabel') }}</span>
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
        class="manage-btn"
        @click="handleManageChannelAction"
      />
    </div>
  </div>

</template>


<script>

  // ChannelPanel with Details, On-Device Size, and Options Dropdown

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import ChannelDetails from './ChannelDetails';
  import WithImportDetails from './WithImportDetails';

  const WithImportDetailsStrings = crossComponentTranslator(WithImportDetails);

  export default {
    name: 'WithSizeAndOptions',
    components: {
      ChannelDetails,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
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
      WithImportDetailsStrings() {
        return WithImportDetailsStrings;
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
        context: '\nOperation that can be performed on a channel',
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

  .manage-btn {
    margin: 0;
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
    position: absolute;
    top: 2px;
    padding: 2px 8px;
    margin-left: 8px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 2px;

    .panel-sm & {
      top: -2px;
    }
  }

</style>
