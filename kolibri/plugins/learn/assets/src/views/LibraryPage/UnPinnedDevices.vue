<template>

  <div
    class="card-main-wrapper"
    :style="cardStyle"
  >

    <KRouterLink
      v-if="allDevices !== null"
      :text="allDevices.nickname.length ? allDevices.nickname : allDevices.device_name"
      :to="{ name: 'LIBRARY', params: { deviceId: allDevices.id } }"
      style="text-decoration:none;"
    >
      <h2 class="device-name">
        <span>
          <KIcon :icon="getDeviceIcon()" />
        </span>
        <span>
          <TextTruncator
            :text="deviceName"
            :maxHeight="52"
          />
        </span>
      </h2>
      <p class="channels">
        {{ $tr('channels', { count: channels }) }}
      </p>
    </KRouterLink>
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
      operatingSystem: {
        type: String,
        required: false,
        default: null,
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
      getDeviceIcon() {
        if (this.operatingSystem === 'Android') {
          return 'device';
        } else if (!this.allDevices.subset_of_users_device) {
          return 'cloud';
        } else {
          return 'laptop';
        }
      },
    },
    $trs: {
      channels: {
        message: '{count, plural, one {channel} other {channels}',
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
    max-height: 258px;
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

  .channels {
    justify-content: center;
    width: 100%;
    color: #616161;
    text-align: center;
  }

  .device-name {
    display: inline-flex;
  }

  .device-name span {
    margin-left: 10px;
  }

</style>
