<template>

  <div class="k-filter">
    <ui-icon
      class="k-filter-icon"
      :ariaLabel="$tr('filter')"
    >
      <mat-svg name="search" category="action" />
    </ui-icon>

    <input
      v-model.trim="model"
      type="search"
      class="k-filter-input"
      :placeholder="placeholder"
      :aria-label="placeholder"
      :autofocus="autofocus"
    >

    <ui-icon-button
      color="black"
      size="small"
      class="k-filter-clear-button"
      :class="model === '' ? '' : 'k-filter-clear-button-visible'"
      :ariaLabel="$tr('clear')"
      @click="model = ''"
    >
      <mat-svg name="clear" category="content" />
    </ui-icon-button>
  </div>

</template>


<script>

  import uiIcon from 'keen-ui/src/UiIcon';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  /**
   * Used to filter items via text input
   */
  export default {
    name: 'kFilterTextbox',
    $trs: {
      filter: 'filter',
      clear: 'clear',
    },
    components: {
      uiIcon,
      uiIconButton,
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .k-filter
    display: inline-block
    position: relative
    max-width: 100%
    width: 540px

  .k-filter-icon
    position: absolute
    top: 9px
    left: 0
    margin-left: 8px
    margin-right: 8px
    font-size: 24px
    color: $core-text-annotation

  .k-filter-input
    margin: 0
    padding-top: 0
    padding-right: 40px
    padding-bottom: 0
    padding-left: 40px
    width: calc(100% - 80px)
    height: 40px
    border: 1px solid $core-grey-300
    border-radius: 2px
    background-color: white
    color: $core-text-default
    font-size: 14px

    &::placeholder
      color: $core-text-annotation

  .k-filter-clear-button
    position: absolute
    top: 9px
    right: 0
    margin-left: 8px
    margin-right: 8px
    width: 24px
    height: 24px
    visibility: hidden
    color: $core-text-default

  .k-filter-clear-button-visible
    visibility: visible

</style>
