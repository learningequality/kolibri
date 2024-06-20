<template>

  <div
    class="channel-card"
    :class="{ 'channel-card-sm': windowIsSmall }"
    :style="{ borderTopColor: $themeTokens.fineLine }"
  >
    <ChannelDetails :channel="channel">
      <template #beforethumbnail>
        <KCheckbox
          class="checkbox"
          :label="channel.name"
          :showLabel="false"
          :checked="$attrs.checked"
          @change="$emit('checkboxchange', { channel: channel, isSelected: $event })"
        />
      </template>

      <template #abovedescription>
        <p v-if="resourcesOnDevice">
          {{ $tr('resourcesOnDevice') }}
        </p>
      </template>
    </ChannelDetails>

    <div class="col-3">
      <p
        v-if="selectedMessage"
        class="selected"
      >
        {{ selectedMessage }}
      </p>
    </div>
  </div>

</template>


<script>

  // Channel Panel with Details and Checkbox

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import ChannelDetails from './ChannelDetails';

  export default {
    name: 'WithCheckbox',
    components: {
      ChannelDetails,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      channel: {
        type: Object,
        default: () => ({}),
      },
      // Message that shows in the top-right corner when selected
      selectedMessage: {
        type: String,
        default: null,
      },
      // If 'true', will display a message about resources on device
      resourcesOnDevice: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      resourcesOnDevice: {
        message: 'Resources on device',
        context:
          'Indicates that the learning resources are on the device being used at that moment.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .channel-card {
    display: flex;
    padding: 32px 0;
    border-top: 1px solid;
  }

  .channel-card-sm {
    flex-direction: column;
    padding: 16px 0;
  }

  .checkbox {
    align-self: center;
    margin-right: 16px;
  }

  .col-3 {
    min-width: 150px;

    .selected {
      margin: 0;
      text-align: right;
    }

    .channel-card-sm & {
      font-size: 14px;
    }
  }

</style>
