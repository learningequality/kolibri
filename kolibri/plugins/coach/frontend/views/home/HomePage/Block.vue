<template>

  <KPageContainer class="block">
    <div class="header">
      <h2 class="title">
        <slot name="title"></slot>
      </h2>
      <KRouterLink
        v-if="showAllLink"
        appearance="flat-button"
        :text="allLinkText"
        :to="allLinkRoute"
        class="btn"
      />
    </div>
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

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    flex: 1 1 auto;
  }

  .btn {
    position: relative;
    right: -8px;
    // Override inline-table rule to get focus outline to show.
    // May not be safe to do everywhere, since it could cause
    // vertical alignment issues like in #5606
    display: inline-block !important;
    flex: 0 1 auto;
    margin-left: 16px;
    text-overflow: ellipsis;
  }

</style>
