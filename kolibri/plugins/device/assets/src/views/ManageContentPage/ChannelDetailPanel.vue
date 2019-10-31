<template>

  <div
    class="channel-detail-panel"
    :class="{'channel-detail-panel-sm': windowIsSmall}"
  >
    <div class="col-1">
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
      </div>
      <div>
        <slot name="abovedescription"></slot>
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
    name: 'ChannelDetailPanel',
    components: {},
    mixins: [responsiveWindowMixin],
    props: {
      channel: {
        type: Object,
      },
    },
    data() {
      return {};
    },
    computed: {},
    methods: {},
    $trs: {
      versionNumber: 'Version {v}',
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

  .channel-detail-panel {
    display: flex;
    width: 100%;
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
    flex-grow: 2;
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

    .col-2-row-1 {
      margin-bottom: 0;

      .selected {
        align-self: center;
        order: -1;
      }
    }
  }

</style>
