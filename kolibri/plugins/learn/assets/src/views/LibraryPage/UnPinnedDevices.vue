<template>

  <div>
    <div
      class="card-main-wrapper"
      :style="cardStyle"
    >

      <KRouterLink
        v-if="device !== null"
        :text="deviceName"
        :to="routeTo"
        style="text-decoration:none;width:100%;"
      >
        <div class="card-main-body">
          <KIcon
            v-if="!viewAll"
            :icon="getDeviceIcon"
            class="icon"
          />
          <div
            v-if="!viewAll"
            class="device-details"
          >
            <TextTruncatorCss
              :text="deviceName"
              :maxLines="2"
              class="name"
            />
            <p class="channels">
              {{ $tr('channels', { count: channelCount }) }}
            </p>
          </div>
          <div
            v-if="viewAll"
            class="name view-all"
          >
            <TextTruncatorCss
              :text="coreString('viewAll')"
              :maxLines="1"
            />
          </div>
        </div>
      </KRouterLink>
    </div>
  </div>

</template>


<script>

  import TextTruncatorCss from 'kolibri.coreVue.components.TextTruncatorCss';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'UnPinnedDevices',
    components: {
      TextTruncatorCss,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowGutter } = useKResponsiveWindow();
      return {
        windowGutter,
      };
    },
    props: {
      device: {
        type: Object,
        required: true,
      },
      routeTo: {
        type: Object,
        required: true,
      },
      viewAll: {
        type: Boolean,
        required: false,
        default: false,
      },
    },

    computed: {
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
          textAlign: 'center',
        };
      },
      channelCount() {
        return this.device['total_count'] || 0;
      },
      deviceName() {
        return this.device.nickname || this.device.device_name;
      },
      getDeviceIcon() {
        if (this.device['operating_system'] === 'Android') {
          return 'device';
        } else if (!this.device['subset_of_users_device']) {
          return 'cloud';
        } else {
          return 'laptop';
        }
      },
    },
    $trs: {
      channels: {
        message: '{count, number, integer} {count, plural, one {channel} other {channels}}',
        context: 'Indicates the number of channels',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../HybridLearningContentCard/card';

  $margin: 24px;

  .card-main-wrapper {
    @extend %dropshadow-1dp;

    position: relative;
    width: 100%;
    padding: 16px;
    margin-bottom: 24px;
    text-decoration: none;
    vertical-align: top;
    border-radius: $radius;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-8dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .card-main-body {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    height: 150px;
    padding: 24px;
  }

  .device-details {
    width: 100%;
    font-style: normal;
  }

  .icon {
    width: 40px;
    min-width: 40px;
    height: 100%;
    margin: 0 10px 40px 0;
  }

  .name {
    font-size: 19px;
    font-weight: 700;
    line-height: 140%;
    color: black;
  }

  .channels {
    padding: 0;
    margin: 5px 0 0;
    font-size: 17px;
    font-weight: 500;
    color: #616161;
  }

  .view-all {
    width: 100%;
    padding: 22px;
    text-align: center;
  }

</style>
