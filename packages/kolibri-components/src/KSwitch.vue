<template>

  <!-- Vendored from Keen UI UISwitch component https://josephuspaye.github.io/Keen-UI/#/ui-switch -->
  <label class="k-switch" :class="classes">
    <div class="k-switch-input-wrapper">
      <input
        ref="input"
        class="k-switch-input"
        type="checkbox"
        dir="auto"

        :checked.prop="isChecked"
        :disabled="disabled"
        :name="name"
        :tabindex="tabindex"
        :value="submittedValue"

        @blur="onBlur"
        @click="onClick"
        @focus="onFocus"
      >

      <div class="k-switch-thumb">
        <div class="k-switch-focus-ring"></div>
      </div>

      <div class="k-switch-track"></div>
    </div>

    <div v-if="label || $slots.default" class="k-switch-label-text">
      <slot>{{ label }}</slot>
    </div>
  </label>

</template>


<script>

  const looseEqual = (a, b) => a == b;

  export default {
    name: 'KSwitch',
    props: {
      name: String,
      label: String,
      tabindex: [String, Number],
      value: {
        type: Boolean,
        required: true,
      },
      trueValue: {
        type: Boolean,
        default: true,
      },
      falseValue: {
        type: Boolean,
        default: false,
      },
      submittedValue: {
        type: String,
        default: 'on', // HTML default
      },
      checked: {
        type: Boolean,
        default: false,
      },
      color: {
        type: String,
        // 'primary' by default, but could add more later
        default: 'primary',
      },
      switchPosition: {
        type: String,
        default: 'left', // 'left' or 'right'
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        isActive: false,
        isChecked: looseEqual(this.value, this.trueValue) || this.checked,
      };
    },
    computed: {
      classes() {
        return [
          `k-switch--color-${this.color}`,
          `k-switch--switch-position-${this.switchPosition}`,
          { 'is-active': this.isActive },
          { 'is-checked': this.isChecked },
          { 'is-disabled': this.disabled },
          { 'is-rtl': this.isRtl },
        ];
      },
    },
    watch: {
      value() {
        this.isChecked = looseEqual(this.value, this.trueValue);
      },
    },
    created() {
      this.$emit('input', this.isChecked ? this.trueValue : this.falseValue);
    },
    methods: {
      onClick(e) {
        const isCheckedPrevious = this.isChecked;
        const isChecked = e.target.checked;
        this.$emit('input', isChecked ? this.trueValue : this.falseValue, e);
        if (isCheckedPrevious !== isChecked) {
          this.$emit('change', isChecked ? this.trueValue : this.falseValue, e);
        }
      },
      onFocus(e) {
        this.isActive = true;
        this.$emit('focus', e);
      },
      onBlur(e) {
        this.isActive = false;
        this.$emit('blur', e);
      },
    },
  };

</script>


<style lang="scss">

  $k-switch-height: 32px !default;
  $k-switch-thumb-size: 20px !default;
  $k-switch-thumb-color: #fafafa !default;
  $k-switch-track-width: 34px !default;
  $k-switch-track-height: 14px !default;
  $k-switch-focus-ring-size: $k-switch-thumb-size * 2.1 !default;

  .k-switch {
    position: relative;
    display: flex;
    align-items: center;
    height: $k-switch-height;

    &.is-checked:not(.is-rtl) {
      .k-switch-thumb {
        transform: translateX($k-switch-track-width - $k-switch-thumb-size);
      }
    }

    &.is-checked.is-rtl {
      .k-switch-thumb {
        transform: translateX($k-switch-track-width - ($k-switch-thumb-size * 2.5));
      }
    }

    &.is-disabled {
      .k-switch-track {
        background-color: rgba(0, 0, 0, 0.12);
      }

      .k-switch-thumb {
        background-color: #bdbdbd;
        box-shadow: none;
      }

      .k-switch-input-wrapper,
      .k-switch-label-text {
        color: rgba(0, 0, 0, 0.38);
        cursor: default;
      }
    }
    &.is-rtl {
      direction: rtl;
    }
  }

  .k-switch-input-wrapper {
    position: relative;
    width: $k-switch-track-width;
    height: $k-switch-thumb-size;
    cursor: pointer;
  }

  .k-switch-input {
    position: absolute;
    opacity: 0;
    body[modality='keyboard'] &:focus + .k-switch-thumb {
      .k-switch-focus-ring {
        opacity: 1;
        transform: scale(1);
      }
    }
  }

  .k-switch-track {
    position: absolute;
    top: (($k-switch-thumb-size - $k-switch-track-height) / 2);
    width: $k-switch-track-width;
    height: $k-switch-track-height;
    background-color: rgba(0, 0, 0, 0.26);
    border-radius: 8px;
    transition: background-color 0.1s linear;
  }

  .k-switch-thumb {
    position: absolute;
    z-index: 1;
    width: $k-switch-thumb-size;
    height: $k-switch-thumb-size;
    background-color: $k-switch-thumb-color;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition-timing-function: ease;
    transition-duration: 0.2s;
    transition-property: background-color, transform;
  }
  .k-switch-focus-ring {
    position: absolute;
    top: -(($k-switch-focus-ring-size - $k-switch-thumb-size) / 2);
    left: -(($k-switch-focus-ring-size - $k-switch-thumb-size) / 2);
    z-index: -1;
    width: $k-switch-focus-ring-size;
    height: $k-switch-focus-ring-size;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    opacity: 0;
    transition: background-color 0.2s ease, transform 0.15s ease, opacity 0.15s ease;
    transform: scale(0);
  }
  .k-switch-label-text {
    margin-left: 16px;
    font-size: 15px;
    cursor: pointer;
  }

  // ================================================
  // Switch positions
  // ================================================
  .k-switch--switch-position-right {
    .k-switch-label-text {
      order: -1;
      margin-right: auto;
      margin-left: 0;
    }
  }

  // ================================================
  // Colors
  // ================================================
  .k-switch--color-primary {
    &.is-checked:not(.is-disabled) {
      .k-switch-track {
        background-color: #a5d6a7;
      }
      .k-switch-thumb {
        background-color: #4caf50;
      }
      .k-switch-focus-ring {
        background-color: #a5d6a7;
      }
    }
  }

</style>
