<template>

  <li
    class="tree-item-wrapper"
    :style="treeItemWrapperStyle"
  >
    <button
      class="tree-item"
      :class="$computedClass({ ':focus': $coreOutline })"
      :disabled="disabled"
      @click="$emit('click')"
    >
      <div class="item-content">
        <div class="leading-actions">
          <slot name="leading-actions"></slot>
        </div>

        <div class="text-content">
          <slot name="title">
            <div
              class="title"
              :style="{
                color: selected ? $themePalette.blue.v_500 : 'inherit',
                fontWeight: selected ? 600 : 'inherit',
              }"
            >
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

  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { currentLanguage, isRtl } from 'kolibri/utils/i18n';
  import { computed } from 'vue';

  export default {
    name: 'TreeItem',
    setup(props) {
      const $themePalette = themePalette();
      const $themeTokens = themeTokens();
      const selectedBgColor = `${$themePalette.blue.v_100}60`; // 60 to give it some opacity

      const isRtlValue = isRtl(currentLanguage);
      const selectedStyles = computed(() => {
        if (!props.selected) {
          return {};
        }

        const borderKey = isRtlValue ? 'borderRight' : 'borderLeft';
        return {
          [borderKey]: `3px solid ${$themePalette.blue.v_500}`,
          backgroundColor: selectedBgColor,
        };
      });

      const treeItemWrapperStyle = computed(() => {
        return {
          borderBottom: `1px solid ${$themeTokens.fineLine}`,
          ...selectedStyles.value,
        };
      });

      return {
        treeItemWrapperStyle,
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
      disabled: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style scoped lang="scss">

  .tree-item-wrapper {
    &:focus-within {
      position: relative;
      z-index: 1;
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

    &:disabled {
      cursor: default;
      opacity: 0.7;
    }
  }

</style>
