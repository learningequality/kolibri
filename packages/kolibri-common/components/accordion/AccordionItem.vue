<template>

  <component
    :is="wrapperTag"
    class="accordion-item"
    :class="{
      disabled,
    }"
    :style="{
      borderColor: $themeTokens.fineLine + '!important',
    }"
  >
    <h3 class="header-wrapper">
      <button
        class="header"
        :style="headerAppearanceOverrides"
        :aria-expanded="isExpanded"
        :aria-controls="contentId"
        :disabled="disabled"
        @click.stop="toggle"
      >
        <div class="header-content">
          <div class="title-actions-wrapper">
            <KIconButton
              v-if="!foldingIconTrailing"
              class="chevron"
              tabindex="-1"
              :icon="isExpanded ? 'chevronDown' : 'chevronRight'"
            />
            <div
              v-if="$slots['leading-actions']"
              class="leading-actions"
            >
              <slot name="leading-actions"></slot>
            </div>
            <slot name="title">
              <span
                :style="{
                  color: disabledTitle ? $themeTokens.textDisabled : 'inherit',
                }"
              >
                {{ title }}
              </span>
            </slot>
          </div>
          <div class="trailing-actions">
            <slot name="trailing-actions"></slot>
            <KIconButton
              v-if="foldingIconTrailing"
              tabindex="-1"
              :icon="isExpanded ? 'chevronDown' : 'chevronRight'"
              @click.stop="toggle"
            />
          </div>
        </div>
      </button>
    </h3>
    <div
      v-if="isExpanded"
      :id="contentId"
      class="content"
      :style="contentAppearanceOverrides"
    >
      <slot name="content"></slot>
    </div>
  </component>

</template>


<script>

  import { v4 as uuidv4 } from 'uuid';
  import { injectAccordionItem } from './useAccordion';

  export default {
    name: 'AccordionItem',
    setup() {
      const uuid = uuidv4();
      const { registerItem, unregisterItem, toggle, isExpanded } = injectAccordionItem(uuid);

      return {
        uuid,
        registerItem,
        unregisterItem,
        toggle,
        isExpanded,
      };
    },
    props: {
      title: {
        type: String,
        required: false,
        default: null,
      },
      disabledTitle: {
        type: Boolean,
        default: false,
      },
      foldingIconTrailing: {
        type: Boolean,
        default: true,
      },
      headerAppearanceOverrides: {
        type: [Object, String],
        default: null,
      },
      contentAppearanceOverrides: {
        type: [Object, String],
        default: null,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      isOpenByDefault: {
        type: Boolean,
        default: false,
      },
      wrapperTag: {
        type: String,
        default: 'div',
      },
    },
    computed: {
      contentId() {
        return `accordion-content-${this.uuid}`;
      },
    },
    watch: {
      isOpenByDefault(newVal) {
        if (newVal && !this.isExpanded) {
          this.toggle();
        }
      },
    },
    mounted() {
      this.registerItem();
      if (this.isOpenByDefault) {
        this.toggle();
      }
    },
    componentWillUnmount() {
      this.unregisterItem();
    },
  };

</script>


<style lang="scss" scoped>

  .accordion-item {
    padding: 0;
    margin: 0;
    list-style: none;
    border-bottom: 1px solid;

    &.disabled {
      pointer-events: none;
      opacity: 0.5;
    }
  }

  .header-wrapper {
    margin: 0;

    .header {
      width: 100%;
      padding: 10px;
      cursor: pointer;
      user-select: text;
      background: unset;
      border: 0;
      outline-offset: 0;

      .header-content {
        display: flex;
        gap: 4px;
        align-items: center;
        justify-content: space-between;
      }
    }
  }

  .leading-actions,
  .trailing-actions,
  .title-actions-wrapper {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .title-actions-wrapper {
    flex: 1;
  }

  .content {
    padding: 10px;
  }

  .chevron {
    margin-right: 8px;
  }

</style>
