<template>

  <div
    class="k-checkbox"
    :class="{
      'k-checkbox-checked': isCurrentlyChecked,
      'k-checkbox-indeterminate': isCurrentlyIndeterminate,
      'k-checkbox-disabled': disabled
    }"
  >
    <div class="wrapper">
      <div class="k-checkbox-container" @click.stop="toggleCheck" tabindex="0">
        <input
          type="checkbox"
          tabindex="-1"
          class="visuallyhidden"
          :name="name"
          :checked="isCurrentlyChecked"
          :indeterminate.prop="isCurrentlyIndeterminate"
          :disabled="disabled"
        >

        <mat-svg v-if="isCurrentlyIndeterminate" category="toggle" name="indeterminate_check_box"/>
        <mat-svg v-else-if="!isCurrentlyIndeterminate && isCurrentlyChecked" category="toggle" name="check_box"/>
        <mat-svg v-else category="toggle" name="check_box_outline_blank"/>

      </div>

      <label :for="name" class="k-checkbox-label" v-if="label" @click.prevent="toggleCheck">{{ label }}</label>
    </div>
  </div>

</template>


<script>

  /**
    * A checkbox
    */
  export default {
    name: 'k-checkbox',
    model: {
      prop: 'checked',
      event: 'change',
    },
    props: {
      /**
       * Name attribute
       */
      name: {
        type: String,
        required: false,
      },
      /**
       * Optional text label
       */
      label: {
        type: String,
        required: false,
      },
      /**
       * Checked state
       */
      checked: {
        type: Boolean,
        default: false,
      },
      /**
       * Indeterminate state, overrides checked state
       */
      indeterminate: {
        type: Boolean,
        default: false,
      },
      /**
       * Disabled state
       */
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      isCurrentlyChecked: false,
      isCurrentlyIndeterminate: false,
    }),
    watch: {
      checked(newCheckedState) {
        this.isCurrentlyChecked = newCheckedState;
      },
      indeterminate(newIndeterminateState) {
        this.isCurrentlyIndeterminate = newIndeterminateState;
      },
    },
    created() {
      this.isCurrentlyChecked = this.checked;
      this.isCurrentlyIndeterminate = this.indeterminate;
    },
    methods: {
      toggleCheck(event) {
        if (!this.disabled) {
          this.isCurrentlyChecked = !this.isCurrentlyChecked;
          this.isCurrentlyIndeterminate = false;
          /**
           * Emits change event
           */
          this.$emit('change', this.isCurrentlyChecked, event);
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $checkbox-height = 24px

  .k-checkbox
    height: $checkbox-height
    margin-top: 8px
    margin-bottom: 8px
    display: table
    &:not(.k-checkbox-disabled)
      .k-checkbox-container, .k-checkbox-label
        cursor: pointer
    .wrapper
      display: table-row

    .k-checkbox-container
      display: inline-block
      width: $checkbox-height
      height: $checkbox-height
      vertical-align: top
      display: table-cell
      svg
        fill: $core-text-annotation
      &:hover, &:focus
        svg
          fill: $core-text-default

    .k-checkbox-label
      // height: $checkbox-height
      padding-left: 8px
      // line-height: $checkbox-height
      display: table-cell

    &.k-checkbox-checked, &.k-checkbox-indeterminate
      .k-checkbox-container
        svg
          fill: $core-action-normal
        &:hover, &:focus
          svg
            fill: $core-action-dark


    &.k-checkbox-disabled
      .k-checkbox-container
        svg
          fill: $core-grey-300

</style>
