<template>

  <section :class="['completion-modal-section', $computedClass(sectionStyle)]">
    <KFixedGrid :numCols="gridColumnsTotal">
      <KFixedGridItem
        v-if="displayGridIcon"
        :span="gridIconSpan"
        class="icon-wrapper"
      >
        <KIcon
          class="icon"
          :icon="icon"
        />
      </KFixedGridItem>

      <KFixedGridItem :span="gridDescriptionSpan">
        <h2 class="title">
          {{ title }}
        </h2>
        <p class="description">
          {{ description }}
        </p>
      </KFixedGridItem>

      <KFixedGridItem
        v-if="hasButton && displayGridButton"
        :span="gridButtonSpan"
        class="grid-button-wrapper"
      >
        <component
          :is="buttonRoute ? 'KRouterLink' : 'KButton'"
          ref="button"
          :to="buttonRoute"
          :text="buttonLabel"
          :primary="true"
          appearance="flat-button"
          class="grid-button"
          @click="$emit('buttonClick')"
        />
      </KFixedGridItem>
    </KFixedGrid>

    <KFixedGrid
      :numCols="gridColumnsTotal"
      class="content"
    >
      <!--
        create an empty grid item with the same width
        as the grid item containing the icon if it's displayed
        to achieve proper alignment of the default slot
        content
      -->
      <KFixedGridItem
        v-if="displayGridIcon"
        :span="1"
      />
      <KFixedGridItem :span="gridContentSpan">
        <slot></slot>
      </KFixedGridItem>
    </KFixedGrid>

    <div
      v-if="hasButton && !displayGridButton"
      :style="{ textAlign: isRtl ? 'left' : 'right', marginTop: '28px' }"
    >
      <component
        :is="buttonRoute ? 'KRouterLink' : 'KButton'"
        ref="button"
        :to="buttonRoute"
        :text="buttonLabel"
        :primary="true"
        appearance="flat-button"
        @click="$emit('buttonClick')"
      />
    </div>
  </section>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  /**
   * A responsive section of the completion modal.
   * It renders section icon, title, description, and an optional action
   * button/link in the first row. Any content can be passed through the default
   * slot to the area below the description in the second row.
   * For smaller resolutions, the icon isn't displayed and the button/link
   * is placed to the bottom of the section instead of the first row.
   *
   * Emits `buttonClick` event when the action button is not a link.
   */
  export default {
    name: 'CompletionModalSection',
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        windowBreakpoint,
      };
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: false,
        default: '',
      },
      /**
       * A label of the action button/link. It won't be
       * displayed if a label is not provided.
       */
      buttonLabel: {
        type: String,
        required: false,
        default: '',
      },
      /**
       * vue-router link object
       * The action button is rendered as a link targeting
       * this route if provided, otherwise it's rendered as
       * a button that emits `buttonClick` event.
       */
      buttonRoute: {
        type: Object,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        gridColumnsTotal: 12,
      };
    },
    computed: {
      hasButton() {
        return Boolean(this.buttonLabel);
      },
      sectionStyle() {
        return {
          ':not(:last-child)': {
            borderBottom: `1px solid ${this.$themePalette.grey.v_400}`,
          },
        };
      },
      displayGridIcon() {
        return this.windowBreakpoint > 0;
      },
      displayGridButton() {
        return this.windowBreakpoint > 0;
      },
      gridIconSpan() {
        if (!this.displayGridIcon) {
          return 0;
        }
        return 1;
      },
      gridDescriptionSpan() {
        return this.gridColumnsTotal - this.gridIconSpan - this.gridButtonSpan;
      },
      gridButtonSpan() {
        if (!this.displayGridButton) {
          return 0;
        }
        return 3;
      },
      gridContentSpan() {
        return this.gridColumnsTotal - this.gridIconSpan;
      },
    },
    methods: {
      /**
       * @public
       */
      getButtonRef() {
        return this.$refs.button;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .completion-modal-section {
    padding-bottom: 22px;
    margin: 28px 0 0;
    font-size: 14px;
  }

  .title {
    margin: 8px 0;
    font-size: 16px;
  }

  .description {
    margin-top: 0;
  }

  .icon-wrapper {
    position: relative;
  }

  .icon {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 24px;
    transform: translate(-50%, -50%);
  }

  .grid-button-wrapper {
    position: relative;
  }

  .grid-button {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .content {
    margin-top: 6px;
  }

</style>
