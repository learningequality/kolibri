<template>

  <div
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
            <div
              v-if="$slots['leading-actions']"
              class="leading-actions"
            >
              <slot name="leading-actions"></slot>
            </div>
            <span
              :style="{
                color: disabledTitle ? $themeTokens.textDisabled : 'inherit',
              }"
            >
              {{ title }}
            </span>
          </div>
          <div class="trailing-actions">
            <slot name="trailing-actions"></slot>
            <KIconButton
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
  </div>

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
        required: true,
      },
      disabledTitle: {
        type: Boolean,
        default: false,
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
    },
    computed: {
      contentId() {
        return `accordion-content-${this.uuid}`;
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
  }

  .content {
    padding: 10px;
  }

</style>
