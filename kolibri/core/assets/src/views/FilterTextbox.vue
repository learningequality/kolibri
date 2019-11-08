<template>

  <div class="k-filter">
    <UiIcon
      class="k-filter-icon"
      :style="{ color: $themeTokens.annotation }"
      :ariaLabel="$tr('filter')"
    >
      <mat-svg name="search" category="action" />
    </UiIcon>

    <input
      v-model.trim="model"
      type="search"
      :class="['k-filter-input', $computedClass(kFilterPlaceHolderStyle)]"
      :style="{
        color: $themeTokens.text,
        border: `2px solid ${$themeTokens.fineLine}`,
      }"
      :placeholder="placeholder"
      :aria-label="placeholder"
      :autofocus="autofocus"
    >

    <UiIconButton
      color="black"
      size="small"
      class="k-filter-clear-button"
      :class="model === '' ? '' : 'k-filter-clear-button-visible'"
      :style="{ color: $themeTokens.text }"
      :ariaLabel="$tr('clear')"
      @click="model = ''"
    >
      <mat-svg name="clear" category="content" />
    </UiIconButton>
  </div>

</template>


<script>

  import throttle from 'lodash/throttle';
  import UiIcon from 'keen-ui/src/UiIcon';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  /**
   * Used to filter items via text input
   */
  export default {
    name: 'FilterTextbox',
    components: {
      UiIcon,
      UiIconButton,
    },
    props: {
      /**
       * v-model
       */
      value: {
        type: String,
      },
      /**
       * Placeholder
       */
      placeholder: {
        type: String,
        required: true,
      },
      /**
       * Whether to autofocus
       */
      autofocus: {
        type: Boolean,
        default: false,
      },
      // If provided, will throttle and use the prop as the delay value in msecs
      throttleInput: {
        type: Number,
        required: false,
      },
    },
    computed: {
      throttledEmitInput() {
        return throttle(val => {
          this.$emit('input', val);
        }, this.throttleInput);
      },
      model: {
        get() {
          return this.value;
        },
        set(val) {
          /**
           * Emits input event with new value
           */
          if (this.throttleInput) {
            this.throttledEmitInput(val);
          } else {
            this.$emit('input', val);
          }
        },
      },
      kFilterPlaceHolderStyle() {
        return {
          '::placeholder': {
            color: this.$themeTokens.annotation,
          },
        };
      },
    },
    $trs: {
      filter: 'filter',
      clear: 'clear',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .k-filter {
    position: relative;
    display: inline-block;
    width: 540px;
    max-width: 100%;
  }

  .k-filter-icon {
    position: absolute;
    top: 9px;
    left: 0;
    margin-right: 8px;
    margin-left: 8px;
    font-size: 24px;
  }

  .k-filter-input {
    width: calc(100% - 80px);
    height: 40px;
    padding-top: 0;
    padding-right: 40px;
    padding-bottom: 0;
    padding-left: 40px;
    margin: 0;
    font-size: 14px;
    border-radius: $radius;
  }

  .k-filter-clear-button {
    position: absolute;
    top: 9px;
    right: 0;
    width: 24px;
    height: 24px;
    margin-right: 8px;
    margin-left: 8px;
    visibility: hidden;
  }

  .k-filter-clear-button-visible {
    visibility: visible;
  }

</style>
