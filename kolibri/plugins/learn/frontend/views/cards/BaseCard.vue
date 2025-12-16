<template>

  <CardLink
    :to="to"
    class="base-card"
  >
    <div>
      <KFixedGrid
        v-if="$slots.topLeft || $slots.topRight"
        numCols="2"
        :style="{ marginBottom: '12px' }"
      >
        <KFixedGridItem span="1">
          <slot name="topLeft"></slot>
        </KFixedGridItem>
        <KFixedGridItem
          span="1"
          alignment="right"
        >
          <slot name="topRight"></slot>
        </KFixedGridItem>
      </KFixedGrid>

      <div
        v-if="collectionTitle"
        :style="{ color: $themeTokens.annotation }"
        dir="auto"
        data-test="collectionTitle"
      >
        {{ collectionTitle }}
      </div>

      <h3 class="title">
        <KTextTruncator
          dir="auto"
          :text="title"
          :maxLines="1"
        />
      </h3>
    </div>

    <div
      class="progress"
      :style="{ color: $themeTokens.annotation }"
    >
      <slot name="progress">
        <KLabeledIcon
          v-if="inProgressLabel"
          :color="$themeTokens.progress"
          :label="inProgressLabel"
          icon="inProgress"
        />
        <KLabeledIcon
          v-else-if="completedLabel && !reportVisible"
          :color="$themePalette.grey.v_300"
          :label="completedLabel"
          icon="permissions"
        />
        <KLabeledIcon
          v-else-if="completedLabel && reportVisible"
          :color="$themeTokens.mastered"
          :label="completedLabel"
          icon="mastered"
        />
      </slot>
    </div>
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
      /**
       * Provide when using the default content of `progress` slot.
       */
      reportVisible: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  $font-size-normal: 16px;
  $font-size-annotation: 14px;

  .base-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: $font-size-annotation;
  }

  .title {
    height: 44px;
    margin-top: 2px;
    font-size: $font-size-normal;
  }

  .progress {
    display: flex;
    align-items: center;
    height: 18px;
  }

</style>
