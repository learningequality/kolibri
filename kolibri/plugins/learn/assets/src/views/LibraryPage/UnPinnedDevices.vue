<template>

  <div>
    <div
      class="card-main-wrapper"
      :style="cardStyle"
    >

      <KRouterLink
        v-if="allDevices !== null"
        :text="allDevices.nickname.length ? allDevices.nickname : allDevices.device_name"
        :to="{ name: 'LIBRARY', params: { deviceId: allDevices.id } }"
        style="text-decoration:none;width:100%;"
      >
        <div class="unpinned-device-card">
          <div class="col device-icon">
            <KIcon :icon="getDeviceIcon(allDevices)" class="icon" />
          </div>
          <div class="col device-detail">
            <TextTruncator
              :text="deviceName"
              :maxHeight="52"
              class="device-name"
            />
            <p v-if="channels" class="channels">
              {{ $tr('channels', { count: channels }) }}
            </p>
          </div>
        </div>
      </KRouterLink>
    </div>
  </div>

</template>


<script>

  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';

  export default {
    name: 'UnPinnedDevices',
    components: {
      TextTruncator,
    },
    setup() {
      const { windowGutter } = useKResponsiveWindow();
      return {
        windowGutter,
      };
    },

    props: {
      deviceName: {
        type: String,
        required: false,
        default: null,
      },
      channels: {
        type: Number,
        required: false,
        default: 0,
      },
      allDevices: {
        type: Object,
        required: true,
      },
    },

    computed: {
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
          marginBottom: `${this.windowGutter}px`,
          minHeight: `${this.overallHeight}px`,
          textAlign: 'center',
        };
      },
    },
    methods: {
      getDeviceIcon(device) {
        if (device['operating_system'] === 'Android') {
          return 'device';
        } else if (!device['subset_of_users_device']) {
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
    display: inline-flex;
    width: 100%;
    padding-bottom: $margin;
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

  .cardgroup .card-main-wrapper {
    display: inline-flex;
  }

  .unpinned-device-card .col {
    display: inline-flex;
  }

  .unpinned-device-card {
    height: 80px;
    margin: 15px;
  }

  .channels {
    position: absolute;
    width: 100%;
    margin-top: 30px;
    font-size: 14px;
    color: #616161;
  }

  .device-name {
    font-size: 16px;
    font-style: normal;
    font-weight: 700;
    line-height: 140%;
    color: black;
  }

  .device-icon {
    margin: 0 10px;
  }

  .icon {
    right: 5px;
    left: 5px;
  }

</style>
