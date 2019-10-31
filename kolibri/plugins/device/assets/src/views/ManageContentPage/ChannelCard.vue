<template>

  <div
    class="channel-card"
    :class="{'channel-card-small': windowIsSmall}"
    :style="{ borderTopColor: $themePalette.grey.v_200 }"
  >
    <KCheckbox
      class="checkbox"
      :label="channel.name"
      :showLabel="false"
      :checked="$attrs.checked"
      @change="$emit('checkboxchange', { channel: channel, isSelected: $event })"
    />

    <ChannelDetailPanel :channel="channel">
      <template v-slot:abovedescription>
        <p v-if="resourcesOnDevice">
          {{ $tr('resourcesOnDevice') }}
        </p>
      </template>
    </ChannelDetailPanel>

    <div class="col-3">
      <p v-if="selectedMessage" class="selected">
        {{ selectedMessage }}
      </p>
    </div>

  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import ChannelDetailPanel from './ChannelDetailPanel';

  export default {
    name: 'ChannelCard',
    components: {
      ChannelDetailPanel,
    },
    mixins: [responsiveWindowMixin],
    props: {
      channel: {
        type: Object,
      },
      // Message that shows in the top-right corner when selected
      selectedMessage: {
        type: String,
        required: false,
      },
      // If 'true', will display a message about resources on device
      resourcesOnDevice: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      resourcesOnDevice: 'Resources on device',
    },
  };

</script>


<style lang="scss" scoped>

  .channel-card {
    display: flex;
    padding: 16px;
    border-top: 1px solid;
  }

  .checkbox {
    align-self: center;
    margin-right: 16px;
  }

  .col-3 {
    min-width: 150px;

    .selected {
      text-align: right;
    }
  }

</style>
