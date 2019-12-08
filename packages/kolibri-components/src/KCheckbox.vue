<template>

  <div
    class="k-checkbox-container"
    :class="{ 'k-checkbox-disabled': disabled }"
    @click="toggleCheck"
  >
    <div class="tr">

      <div class="k-checkbox">
        <input
          :id="id"
          ref="kCheckboxInput"
          type="checkbox"
          class="k-checkbox-input"
          :checked="isCurrentlyChecked"
          :indeterminate.prop="isCurrentlyIndeterminate"
          :disabled="disabled"
          @click.stop="toggleCheck"
          @focus="isActive = true"
          @blur="markInactive"
          @keydown="$emit('keydown', $event)"
        >

        <mat-svg
          v-if="isCurrentlyIndeterminate"
          :style="notBlank"
          category="toggle"
          name="indeterminate_check_box"
        />
        <mat-svg
          v-else-if="!isCurrentlyIndeterminate && isCurrentlyChecked"
          :style="[ notBlank, activeOutline ]"
          category="toggle"
          name="check_box"
        />
        <mat-svg
          v-else
          :style="[ blank, activeOutline ]"
          category="toggle"
          name="check_box_outline_blank"
        />

      </div>

      <div
        v-if="!label && $slots.default"
        class="k-checkbox-label"
      >
        <slot></slot>
      </div>

      <label
        v-else-if="label && !$slots.default"
        dir="auto"
        class="k-checkbox-label"
        :for="id"
        :class="{ 'visuallyhidden' : !showLabel }"
        :style="labelStyle"
        @click.prevent
      >
        {{ label }}
      </label>

    </div>
  </div>

</template>


<script>

  /**
   * Used for toggling boolean user input
   */
  export default {
    name: 'KCheckbox',
    props: {
      /**
       * Label
       */
      label: {
        type: String,
        required: false,
      },
      /**
       * Whether to show label
       */
      showLabel: {
        type: Boolean,
        default: true,
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
      isActive: false,
    }),
    computed: {
      id() {
        return `k-checkbox-${this._uid}`;
      },
      blank() {
        return {
          fill: this.disabled ? this.$themeTokens.textDisabled : this.$themeTokens.annotation,
        };
      },
      notBlank() {
        return {
          fill: this.disabled ? this.$themeTokens.textDisabled : this.$themeTokens.primary,
        };
      },
      activeOutline() {
        return this.isActive ? this.$coreOutline : {};
      },
      labelStyle() {
        return {
          color: this.disabled ? this.$themeTokens.textDisabled : '',
        };
      },
    },
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
          this.$refs.kCheckboxInput.focus();
          this.isCurrentlyIndeterminate = false;
          /**
           * Emits change event
           */
          this.$emit('change', this.isCurrentlyChecked, event);
        }
      },
      markInactive() {
        this.isActive = false;
        /**
         * Emits blur event, useful for validation
         */
        this.$emit('blur');
      },
      /**
       * @public
       */
      focus() {
        this.$refs.kCheckboxInput.focus();
      },
    },
  };

</script>


<style lang="scss" scoped>

  $checkbox-height: 24px;

  .k-checkbox-container {
    display: table;
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .tr {
    display: table-row;
  }

  .k-checkbox {
    position: relative;
    display: table-cell;
    width: $checkbox-height;
    height: $checkbox-height;
    vertical-align: top;
    cursor: pointer;
  }

  .k-checkbox-input {
    position: absolute;
    top: 50%;
    left: 50%;
    cursor: pointer;
    opacity: 0;
    transform: translate(-50%, -50%);
  }

  .k-checkbox-label {
    display: table-cell;
    padding-left: 8px;
    line-height: 24px;
    cursor: pointer;
    user-select: none;
  }

  .k-checkbox-disabled {
    .k-checkbox,
    .k-checkbox-input,
    .k-checkbox-label {
      cursor: default;
    }
  }

</style>
