<template>

  <div
    class="k-checkbox"
    :class="{
      'k-checkbox-checked': isCurrentlyChecked,
      'k-checkbox-indeterminate': isCurrentlyIndeterminate,
      'k-checkbox-disabled': disabled
    }"
  >
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
        required: true,
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
    margin-top: 16px
    margin-bottom: 16px
    &:not(.k-checkbox-disabled)
      cursor: pointer
      .k-checkbox-label
        cursor: pointer

    .k-checkbox-container
      display: inline-block
      width: $checkbox-height
      height: $checkbox-height
      vertical-align: top
      &:focus
        outline: none
      svg
        fill: $core-text-annotation

    .k-checkbox-label
      height: $checkbox-height
      margin-left: 8px
      line-height: $checkbox-height

    &.k-checkbox-checked, &.k-checkbox-indeterminate
      .k-checkbox-container
        svg
          fill: $core-action-normal

    &.k-checkbox-disabled
      .k-checkbox-container
        svg
          fill: $core-grey-300

</style>
