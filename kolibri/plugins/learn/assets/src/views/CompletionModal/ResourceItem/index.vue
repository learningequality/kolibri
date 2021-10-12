<template>

  <component
    :is="contentNodeRoute ? 'KRouterLink' : 'div'"
    :to="contentNodeRoute"
    :class="['resource-item', $computedClass({ ':focus': $coreOutline })]"
  >
    <ResourceLabel
      v-if="size === 'small'"
      :contentNode="contentNode"
      :contentNodeRoute="contentNodeRoute"
      disableLinkFocus
    />

    <KFixedGrid
      v-else-if="size === 'medium'"
      numCols="2"
      gutter="16"
    >
      <KFixedGridItem span="1">
        <ContentNodeThumbnail :contentNode="contentNode" />
      </KFixedGridItem>
      <KFixedGridItem
        span="1"
        :style="{ position: 'relative' }"
      >
        <ResourceLabel
          :contentNode="contentNode"
          :contentNodeRoute="contentNodeRoute"
          :style="{ position: 'absolute', top: '50%', transform: 'translateY(-50%)' }"
          disableLinkFocus
          hideIcon
        />
      </KFixedGridItem>
    </KFixedGrid>

    <template v-else-if="size === 'large'">
      <ContentNodeThumbnail :contentNode="contentNode" />
      <ResourceLabel
        :contentNode="contentNode"
        :contentNodeRoute="contentNodeRoute"
        :style="{ marginTop: '16px' }"
        disableLinkFocus
        condensed
      />
    </template>
  </component>

</template>


<script>

  import ContentNodeThumbnail from '../../thumbnails/ContentNodeThumbnail';
  import ResourceLabel from './ResourceLabel';

  /**
   * Renders title, learning activity/topic icon,
   * and (when available) learning activity duration.
   * A thumbnail is displayed for larger sizes.
   * It can be rendered as a link.
   */
  export default {
    name: 'ResourceItem',
    components: {
      ResourceLabel,
      ContentNodeThumbnail,
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      /**
       * vue-router link object
       * The whole component behaves like
       * a link when provided.
       */
      contentNodeRoute: {
        type: Object,
        required: false,
        default: null,
      },
      /**
       * Can be'small', 'medium', or 'large'
       * Only learning activity icon, title, and duration
       * is displayed when 'small'. In addition, a resource thumbnail
       * is displayed for both 'medium' and 'large'. The thumbnail
       * and text is stacked horizontally for 'medium' whereas for
       * 'large' it's stacked vertically and the thumbnail is larger.
       */
      size: {
        type: String,
        required: false,
        default: 'small',
        validator(value) {
          return ['small', 'medium', 'large'].includes(value);
        },
      },
    },
  };

</script>


<style lang="scss" scoped>

  .resource-item {
    display: block; // make sure that focus ring displays around the whole item area
    color: inherit;
    text-decoration: none;
    direction: inherit; // ensure that RTL works well when used within `KGrid`
  }

</style>
