<template>

  <CardLink
    :to="to"
    class="base-card"
  >
    <KFixedGrid
      v-if="$slots.topLeft || $slots.topRight"
      numCols="2"
      :style="{ marginBottom: '12px' }"
    >
      <KFixedGridItem span="1">
        <slot name="topLeft"></slot>
      </KFixedGridItem>
      <KFixedGridItem span="1">
        <slot name="topRight"></slot>
      </KFixedGridItem>
    </KFixedGrid>

    <div
      v-if="collectionTitle"
      data-test="collectionTitle"
    >
      {{ collectionTitle }}
    </div>

    <h3 class="title">
      {{ title }}
    </h3>

    <slot name="progress">
      <div
        class="progress"
        :class="themeClasses.progress"
      >
        <KLabeledIcon
          v-if="inProgressLabel"
          icon="inProgress"
          :label="inProgressLabel"
        />
        <KLabeledIcon
          v-else-if="completedLabel"
          icon="mastered"
          :label="completedLabel"
        />
      </div>
    </slot>
  </CardLink>

</template>


<script>

  import CardLink from './CardLink.vue';

  /**
   * Common layout for a lesson, quiz and resource cards.
   * Provides `topLeft` and `topRight` slots for top left
   * and top right areas above the title.
   * Provides `progress` slot with default content that
   * can be overriden.
   */
  export default {
    name: 'BaseCard',
    components: {
      CardLink,
    },
    props: {
      /**
       * vue-router link object
       */
      to: {
        type: Object,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      collectionTitle: {
        type: String,
        required: false,
        default: '',
      },
      /**
       * Provide when using the default content of `progress` slot.
       */
      completedLabel: {
        type: String,
        required: false,
        default: '',
      },
      /**
       * Provide when using the default content of `progress` slot.
       */
      inProgressLabel: {
        type: String,
        required: false,
        default: '',
      },
    },
    computed: {
      themeClasses() {
        const { annotation } = this.$themeTokens;
        return {
          progress: this.$computedClass({
            color: annotation,
          }),
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  $font-size-normal: 16px;
  $font-size-annotation: 14px;

  .base-card {
    font-size: $font-size-annotation;
  }

  .title {
    margin-top: 2px;
    font-size: $font-size-normal;
  }

  .progress {
    margin-top: 16px;
  }

</style>
