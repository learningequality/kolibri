<template>

  <CardLink
    v-if="channel"
    :to="to"
    class="base-channel-card"
  >
    <h3 class="title">
      <KTextTruncator
        dir="auto"
        :text="channel.name"
        :maxLines="1"
      />
    </h3>

    <KFixedGrid
      numCols="4"
      gutter="16"
      class="content"
      :style="{ borderTop: `1px solid ${$themeTokens.fineLine}` }"
    >
      <KFixedGridItem span="1">
        <ChannelThumbnail
          v-if="channel.thumbnail"
          :thumbnailUrl="channel.thumbnail"
          class="channel-thumbnail-wrapper"
        />
      </KFixedGridItem>
      <!--
        unset text-align to fix `KFixedGridItem`'s `text-align: right`
        conflicting with  `dir="auto"`
      -->
      <KFixedGridItem
        span="3"
        :style="{ textAlign: 'unset' }"
      >
        <KTextTruncator
          v-if="description"
          dir="auto"
          :text="description"
          :maxLines="6"
        />
      </KFixedGridItem>
    </KFixedGrid>
  </CardLink>

</template>


<script>

  import ChannelThumbnail from '../thumbnails/ChannelThumbnail';
  import CardLink from './CardLink';

  export default {
    name: 'BaseChannelCard',
    components: {
      ChannelThumbnail,
      CardLink,
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
      /**
       * vue-router link object
       */
      to: {
        type: Object,
        required: true,
      },
    },
    computed: {
      description() {
        return this.channel ? this.channel.tagline || this.channel.description : '';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .base-channel-card {
    height: 218px;
  }

  .title {
    margin-top: 6px;
    margin-bottom: 12px;
  }

  .content {
    padding: 14px;
    // make the top border take the full card width
    margin-right: -16px;
    margin-left: -16px;
  }

  .channel-thumbnail-wrapper {
    height: 132px;
  }

</style>
