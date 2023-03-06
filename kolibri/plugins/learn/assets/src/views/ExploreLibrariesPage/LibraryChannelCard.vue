<template>

  <div
    class="channel-card"
    :style="cardStyle"
  >
    <img
      v-if="channel.thumbnail"
      :src="channel.thumbnail"
      class="channel-thumbnail"
    >
    <h2
      class="channel-name"
      dir="auto"
    >
      <TextTruncatorCss
        :text="channel.name"
        :maxLines="1"
      />
    </h2>
    <p dir="auto">
      <TextTruncatorCss
        :text="channel.description"
        :maxLines="2"
      />
    </p>
    <p
      dir="auto"
      class="version"
      :style="versionStyle"
    >
      {{ $tr('version', { version: channel.version }) }}
    </p>
  </div>

</template>


<script>

  import TextTruncatorCss from 'kolibri.coreVue.components.TextTruncatorCss';

  export default {
    name: 'LibraryChannelCard',
    components: {
      TextTruncatorCss,
    },
    props: {
      channel: {
        type: Object,
        required: true,
        default() {
          return {};
        },
      },
    },
    computed: {
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
        };
      },
      versionStyle() {
        return {
          color: this.$themeTokens.annotation,
        };
      },
    },
    $trs: {
      version: {
        message: 'Version {version, number, integer}',
        context:
          'Indicates the channel version. This can be updated when new resources are made available in a channel.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .channel-card {
    @extend %dropshadow-1dp;

    padding: 30px;
    margin-bottom: 20px;
    text-decoration: none;
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

  .channel-thumbnail {
    max-width: 100px;
    max-height: 80px;
  }

  .version {
    padding: 0;
    margin-bottom: 0;
  }

</style>
