<template>

  <div
    class="channel-detail-panel"
    :class="{ 'channel-detail-panel-sm': windowIsSmall }"
  >
    <div class="col-1">
      <slot name="beforethumbnail"></slot>
      <img
        v-if="channel.thumbnail"
        class="thumbnail"
        :src="channel.thumbnail"
        loading="lazy"
      >
      <KIcon
        v-else
        icon="channel"
        class="thumbnail-svg"
        :style="{ backgroundColor: $themePalette.grey.v_300 }"
      />
    </div>

    <div class="col-2">
      <div class="col-2-row-1">
        <div>
          <h2
            class="channel-name"
            dir="auto"
          >
            {{ channel.name }}
          </h2>
          <slot name="belowname"></slot>
          <p
            class="version"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ $tr('versionNumber', { v: channelVersion || channel.version }) }}
          </p>
        </div>
      </div>

      <div>
        <slot name="abovedescription"></slot>
        <p
          class="description"
          dir="auto"
        >
          <span v-if="channel.description">{{ channel.description }}</span>
          <span
            v-else
            :style="{ color: $themeTokens.annotation }"
          >
            {{ $tr('defaultDescription') }}
          </span>
        </p>
        <p class="coach-content">
          <CoachContentLabel
            :value="channel.num_coach_contents"
            :isTopic="true"
          />
        </p>
        <slot name="belowdescription"></slot>
      </div>
    </div>

    <slot name="append"></slot>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';

  export default {
    name: 'ChannelDetails',
    components: {
      CoachContentLabel,
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
      // Used to override the version number in some cases
      channelVersion: {
        type: [String, Number],
        default: null,
      },
    },
    $trs: {
      versionNumber: {
        message: 'Version {v, number, integer}',
        context:
          'Indicates the channel version. This can be updated when new resources are made available in a channel.',
      },
      defaultDescription: {
        message: '(No description)',
        context:
          'This text will display only if a description for the channel has not been written by the resource creator.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  $thumbside: 128px;
  $thumbside-sm: 64px;

  h2,
  p {
    margin: 8px 0;
  }

  .channel-detail-panel {
    display: flex;
    width: 100%;
  }

  .channel-name {
    display: inline;
  }

  // Col 1: Checkbox and thumbnail
  .col-1 {
    display: flex;
    flex-grow: 0;
    height: $thumbside;

    .checkbox {
      align-self: center;
      margin-right: 16px;
    }

    .thumbnail {
      width: $thumbside;
      max-width: $thumbside;
      height: auto;
      max-height: $thumbside;
      margin-right: 16px;
      object-fit: contain;
    }

    .thumbnail-svg {
      width: $thumbside;
      height: $thumbside;
      margin-right: 16px;
    }
  }

  // Col 2: Title, description, other texts
  .col-2 {
    flex-direction: column;
    flex-grow: 2;
    align-items: stretch;

    .description {
      max-width: 500px;

      /* KA Burmese description with no spaces would run off
     * screen - this breaks it within the container */
      word-wrap: break-word;
    }

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
  .channel-detail-panel-sm {
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

    .col-2 {
      margin-top: 8px;
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
