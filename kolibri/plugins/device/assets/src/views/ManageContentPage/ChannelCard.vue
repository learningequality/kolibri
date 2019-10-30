<template>

  <div
    class="channel-card"
    :class="{'small': windowIsSmall}"
    :style="{ borderTopColor: $themePalette.grey.v_200 }"
  >
    <div class="col-1">
      <KCheckbox
        class="checkbox"
        :label="channel.name"
        :showLabel="false"
        @change="$emit('checkboxchange', { channel: channel, isSelected: $event })"
      />
      <img
        v-if="channel.thumbnail"
        class="thumbnail"
        :src="channel.thumbnail"
      >
      <mat-svg
        v-else
        category="navigation"
        name="apps"
        class="thumbnail-svg"
        :style="{ backgroundColor: $themePalette.grey.v_200 }"
      />
    </div>

    <div class="col-2">
      <div class="col-2-row-1">
        <div>
          <h2 dir="auto">
            {{ channel.name }}
          </h2>
          <p class="version" :style="{ color: $themeTokens.annotation }">
            {{ $tr('versionNumber', { v: channel.version }) }}
          </p>
        </div>
        <p class="selected">
          {{ selectedMessage || '' }}
        </p>
      </div>
      <div>
        <p v-if="resourcesOnDevice">
          {{ $tr('resourcesOnDevice') }}
        </p>
        <p dir="auto">
          {{ channel.description }}
        </p>
      </div>

    </div>

  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'ChannelCard',
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
      versionNumber: 'Version {v}',
      resourcesOnDevice: 'Resources on device',
    },
  };

</script>


<style lang="scss" scoped>

  $thumbside: 128px;
  $thumbside-sm: 64px;

  h2,
  p {
    margin: 0;
  }

  .channel-card {
    display: flex;
    width: 100%;
    padding: 16px;
    border-top: 1px solid;
  }

  .channel-card:last-of-type {
    border-bottom-style: none !important;
  }

  // Col 1: Checkbox and thumbnail
  .col-1 {
    display: flex;
    flex-grow: 0;
    height: $thumbside;
    margin-right: 16px;

    .checkbox {
      align-self: center;
      margin-right: 16px;
    }

    .thumbnail {
      width: auto;
      max-width: $thumbside;
      height: auto;
      max-height: $thumbside;
    }

    .thumbnail-svg {
      width: $thumbside;
      height: $thumbside;
    }
  }

  // Col 2: Title, description, other texts
  .col-2 {
    flex-direction: column;
    flex-grow: 1;
    align-items: stretch;

    .col-2-row-1 {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .version {
      font-size: 0.85rem;
    }
  }

  // Small-window layout
  .small {
    flex-direction: column;
    font-size: 0.9rem;

    h2,
    p {
      margin: 4px 0;
    }

    .col-1 {
      // flex-direction: column;
      align-items: center;
      height: auto;
      margin-right: 0;

      .checkbox {
        margin-right: 16px;
      }

      .thumbnail {
        max-width: $thumbside-sm;
        max-height: $thumbside-sm;
      }

      .thumbnail-svg {
        width: $thumbside-sm;
        height: $thumbside-sm;
      }
    }

    .col-2-row-1 {
      margin-bottom: 0;

      .selected {
        align-self: center;
        order: -1;
      }
    }
  }

</style>
