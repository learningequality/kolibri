<template>

  <li
    class="tree-item-wrapper"
    :class="{ selected: selected }"
  >
    <button
      class="tree-item"
      @click="$emit('click')"
    >
      <div class="item-content">
        <div class="leading-actions">
          <slot name="leading-actions"></slot>
        </div>

        <div class="text-content">
          <slot name="title">
            <div class="title">
              <KTextTruncator
                :text="title"
                :maxLines="1"
              />
            </div>
          </slot>
          <slot name="description">
            <div class="description">
              {{ description }}
            </div>
          </slot>
        </div>
      </div>
      <div class="trailing-actions">
        <slot name="trailing-actions"></slot>
      </div>
    </button>
  </li>

</template>


<script>

  import { themePalette } from 'kolibri-design-system/lib/styles/theme';

  export default {
    name: 'TreeItem',
    setup() {
      const selectedBgColor = `${themePalette().blue.v_100}60`; // 60 to give it some opacity
      return {
        selectedBgColor,
      };
    },
    props: {
      title: {
        type: String,
        default: null,
      },
      description: {
        type: String,
        default: null,
      },
      selected: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style scoped lang="scss">

  .tree-item-wrapper {
    /* stylelint-disable-next-line */
    border-bottom: 1px solid v-bind('$themeTokens.fineLine');

    &.selected {
      /* stylelint-disable-next-line */
      border-left: 3px solid v-bind('$themePalette.blue.v_500');
      /* stylelint-disable-next-line */
      background-color: v-bind('selectedBgColor');

      .text-content .title {
        font-weight: 600;
        /* stylelint-disable-next-line */
        color: v-bind('$themePalette.blue.v_500');
      }
    }
  }

  .tree-item {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 52px;
    padding: 12px 16px;
    cursor: pointer;
    user-select: text;
    background: unset;
    border: 0;
    outline-offset: -3px;

    .item-content {
      display: flex;
      gap: 8px;
      align-items: center;
      min-width: 0;

      .text-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        min-width: 0;

        .title {
          max-width: 100%;
          font-size: 14px;
          line-height: 1.2;
        }

        .description {
          font-size: 12px;
        }
      }
    }
  }

</style>
