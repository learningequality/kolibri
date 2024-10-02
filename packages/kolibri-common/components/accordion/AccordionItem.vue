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
        @click.stop="toggle"
      >
        <div class="header-content">
          <div class="d-flex">
            <div
              v-if="$slots['leading-actions']"
              class="leading-actions"
            >
              <slot name="leading-actions"></slot>
            </div>
            <span>
              {{ title }}
            </span>
          </div>
          <div class="trailing-actions">
            <KIconButton
              :icon="isExpanded ? 'chevronDown' : 'chevronRight'"
              @click.stop="toggle"
            />
            <slot name="trailing-actions"></slot>
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
      const _uid = uuidv4();
      const { registerItem, unregisterItem, toggle, isExpanded } = injectAccordionItem(_uid);

      return {
        _uid,
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
    },
    computed: {
      contentId() {
        return `accordion-content-${this._uid}`;
      },
    },
    mounted() {
      this.registerItem();
    },
    componentWillUnmount() {
      this.unregisterItem();
    },
  };

</script>


<style scoped lang="scss">

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
        align-items: center;
        justify-content: space-between;
      }
    }
  }

  .leading-actions {
    display: flex;
    align-items: center;
  }

  .header-label {
    display: flex;
    align-items: center;
    justify-content: space-between;

    /deep/ .link-text {
      display: none;
    }
  }

  .content {
    padding: 10px;
  }

  .d-flex {
    display: flex;
    align-items: center;
  }

</style>
