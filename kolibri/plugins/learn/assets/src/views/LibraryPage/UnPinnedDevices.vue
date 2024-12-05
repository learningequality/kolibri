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
        style="width: 100%; text-decoration: none"
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
            <KTextTruncator
              :text="deviceName"
              :maxLines="2"
              class="name"
              :style="{ color: $themePalette.black }"
            />
            <p
              class="channels"
              :style="{ color: channelColor }"
            >
              {{ $tr('channels', { count: channelCount }) }}
            </p>
          </div>
          <div
            v-if="viewAll"
            class="name view-all"
          >
            <KTextTruncator
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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'UnPinnedDevices',
    components: {},
    mixins: [commonCoreStrings],
    props: {
      device: {
        type: Object,
        required: true,
      },
      channelCount: {
        type: Number,
        default: 0,
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
      channelColor() {
        return this.$themePalette.grey.v_700;
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
      @extend %dropshadow-6dp;
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
  }

  .channels {
    padding: 0;
    margin: 5px 0 0;
    font-size: 17px;
    font-weight: 500;
  }

  .view-all {
    width: 100%;
    padding: 22px;
    text-align: center;
  }

</style>
