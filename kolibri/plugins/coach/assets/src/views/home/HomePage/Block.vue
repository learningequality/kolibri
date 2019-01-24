<template>

  <div class="new-coach-block">
    <KGrid>
      <KGridItem sizes="100, 50, 50" percentage>
        <h2>
          <span class="icon"><slot name="icon"></slot></span>
          {{ title }}
        </h2>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage alignment="right">
        <KRouterLink
          appearance="flat-button"
          :text="allLinkText"
          :to="allLinkRoute"
          class="btn"
        />
      </KGridItem>
    </KGrid>
    <slot></slot>
  </div>

</template>


<script>

  import commonCoach from '../../common';

  export default {
    name: 'Block',
    mixins: [commonCoach],
    props: {
      title: {
        type: String,
        required: true,
      },
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

  .new-coach-block {
    min-width: auto;
    margin-top: 16px;
  }

  .icon {
    position: relative;
    display: inline-block;
    margin-right: 4px;
  }

  .btn {
    position: relative;
    top: 4px;
  }

  .block-item:not(:last-child) {
    padding-right: 24px;
    padding-bottom: 16px;
    padding-left: 24px;
    margin-right: -24px;
    margin-left: -24px;
    border-bottom: 1px solid #dedede;
  }

</style>
