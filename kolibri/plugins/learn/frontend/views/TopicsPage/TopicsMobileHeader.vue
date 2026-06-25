<template>

  <KGrid
    class="mobile-header"
    data-testid="mobile-header"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <KGridItem :layout4="{ span: 3 }">
      <h1
        class="mobile-title"
        data-testid="mobile-title"
      >
        <KTextTruncator
          :text="topic.title"
          :maxLines="2"
        />
      </h1>
    </KGridItem>
    <KGridItem :layout4="{ span: 1 }">
      <img
        :src="topic.thumbnail"
        alt=""
        class="channel-logo"
        loading="lazy"
      >
    </KGridItem>
  </KGrid>

</template>


<script>

  export default {
    name: 'TopicsMobileHeader',
    components: {},
    props: {
      topic: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .mobile-header {
    position: relative;
    top: 70px;
    height: 70px;
  }

  .mobile-title {
    height: 100%;
    padding-right: 16px;
    padding-left: 16px;
    margin-top: 16px;
    font-size: 18px;
  }

  .channel-logo {
    position: absolute;
    top: 16px;
    right: 16px;
    max-height: 40px;
  }

</style>
