<template>

  <KPageContainer class="block">
    <KGrid>
      <KGridItem
        :layout8="{ span: showAllLink ? 5 : 8 }"
        :layout12="{ span: showAllLink ? 8 : 12 }"
      >
        <h2>
          <slot name="title"></slot>
        </h2>
      </KGridItem>
      <KGridItem
        v-if="showAllLink"
        :layout="{ alignment: 'right' }"
        :layout8="{ span: 3 }"
        :layout12="{ span: 4 }"
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
      showAllLink: {
        type: Boolean,
        default: true,
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
    // Override inline-table rule to get focus outline to show.
    // May not be safe to do everywhere, since it could cause
    // vertical alignment issues like in #5606
    display: inline-block !important;
  }

</style>
