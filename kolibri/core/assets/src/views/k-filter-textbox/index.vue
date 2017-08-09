<template>

  <div class="k-filter">

    <div class="tr">
      <ui-icon
        icon="search"
        class="k-filter-icon"
        :ariaLabel="$tr('filter')"
      />

      <input
        v-model.trim="model"
        type="search"
        class="k-filter-input"
        :placeholder="placeholder"
        :aria-label="placeholder"
        :autofocus="autofocus"
      >

      <ui-icon-button
        icon="clear"
        color="black"
        size="small"
        class="k-filter-clear-button"
        :class="model === '' ? '' : 'k-filter-clear-button-visible'"
        :ariaLabel="$tr('clear')"
        @click="model = ''"
      />
    </div>
  </div>

</template>


<script>

  import uiIcon from 'keen-ui/src/UiIcon';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  /**
   * Used to filter items via text input
   */
  export default {
    name: 'k-filter-textbox',
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
    display: table
    background-color: white
    border: 1px solid $core-grey-300

  .tr
    display: table-row

  .k-filter-icon
    display: table-cell
    font-size: 24px
    vertical-align: middle
    padding-right: 8px
    padding-left: 8px

  .k-filter-input
    display: table-cell
    vertical-align: middle
    max-width: 300px
    width: calc(100% - 33px)
    height: 36px
    margin: 0
    padding: 0
    border: none
    background-color: white
    color: $core-text-default

    &::placeholder
      color: $core-text-annotation

  .k-filter-clear-button
    display: table-cell
    vertical-align: middle
    visibility: hidden
    width: 24px
    height: 24px
    margin-right: 8px
    color: $core-text-default

  .k-filter-clear-button-visible
    visibility: visible

</style>
