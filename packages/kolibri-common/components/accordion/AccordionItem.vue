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
        @click="toggle"
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
              icon="chevronDown"
              @click="toggle"
            />
            <slot name="trailing-actions"></slot>
          </div>
        </div>
      </button>
    </h3>
    <div
      v-if="isExpanded"
      class="content"
      :style="contentAppearanceOverrides"
    >
      <slot name="content"></slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'AccordionItem',
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
      isExpanded() {
        return !this.disabled;
      },
    },
    methods: {
      toggle() {
        this.isExpanded;
      },
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
