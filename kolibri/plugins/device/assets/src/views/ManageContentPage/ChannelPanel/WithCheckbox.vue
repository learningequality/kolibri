<template>

  <div
    class="channel-card"
    :class="{'channel-card-sm': windowIsSmall}"
    :style="{ borderTopColor: $themePalette.grey.v_200 }"
  >
    <ChannelDetails :channel="channel">
      <template v-slot:beforethumbnail>
        <KCheckbox
          class="checkbox"
          :label="channel.name"
          :showLabel="false"
          :checked="$attrs.checked"
          @change="$emit('checkboxchange', { channel: channel, isSelected: $event })"
        />
      </template>

      <template v-slot:abovedescription>
        <p v-if="resourcesOnDevice">
          {{ $tr('resourcesOnDevice') }}
        </p>
      </template>
    </ChannelDetails>

    <div class="col-3">
      <p v-if="selectedMessage" class="selected">
        {{ selectedMessage }}
      </p>
    </div>

  </div>

</template>


<script>

  // Channel Panel with Details and Checkbox

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import ChannelDetails from './ChannelDetails';

  export default {
    name: 'WithCheckbox',
    components: {
      ChannelDetails,
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
