<template>

  <KPageContainer class="block">
    <KGrid>
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <h2>
          <slot name="title"></slot>
        </h2>
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'right' }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <KRouterLink
          appearance="flat-button"
          :text="allLinkText"
          :to="allLinkRoute"
          class="btn"
        />
      </KGridItem>
    </KGrid>
    <slot></slot>
  </KPageContainer>

</template>


<script>

  import commonCoach from '../../common';

  export default {
    name: 'Block',
    mixins: [commonCoach],
    props: {
      allLinkText: {
        type: String,
        required: true,
      },
      allLinkRoute: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .block {
    margin-top: 16px;
  }

  .btn {
    position: relative;
    top: 4px;
    right: -24px;
  }

</style>
