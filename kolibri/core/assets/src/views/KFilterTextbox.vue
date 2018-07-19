<template>

  <div class="k-filter">
    <UiIcon
      class="k-filter-icon"
      :ariaLabel="$tr('filter')"
    >
      <mat-svg name="search" category="action" />
    </UiIcon>

    <input
      v-model.trim="model"
      type="search"
      class="k-filter-input"
      :placeholder="placeholder"
      :aria-label="placeholder"
      :autofocus="autofocus"
    >

    <UiIconButton
      color="black"
      size="small"
      class="k-filter-clear-button"
      :class="model === '' ? '' : 'k-filter-clear-button-visible'"
      :ariaLabel="$tr('clear')"
      @click="model = ''"
    >
      <mat-svg name="clear" category="content" />
    </UiIconButton>
  </div>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  /**
   * Used to filter items via text input
   */
  export default {
    name: 'KFilterTextbox',
    $trs: {
      filter: 'filter',
      clear: 'clear',
    },
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
    },
    computed: {
      model: {
        get() {
          return this.value;
        },
        set(val) {
          /**
           * Emits input event with new value
           */
          this.$emit('input', val);
        },
      },
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
    color: $core-text-annotation;
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
    color: $core-text-default;
    background-color: white;
    border: 1px solid $core-grey-300;
    border-radius: 2px;

    &::placeholder {
      color: $core-text-annotation;
    }
  }

  .k-filter-clear-button {
    position: absolute;
    top: 9px;
    right: 0;
    width: 24px;
    height: 24px;
    margin-right: 8px;
    margin-left: 8px;
    color: $core-text-default;
    visibility: hidden;
  }

  .k-filter-clear-button-visible {
    visibility: visible;
  }

</style>
