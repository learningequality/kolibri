<template>

  <li class="ui-select-option" :class="classes" :style="selectedStyle">
    <slot>
      <div v-if="multiple" class="ui-select-option-checkbox" :style="selectedStyle">
        <UiIcon v-if="selected">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
              d="M9.984 17.016l9-9-1.406-1.453-7.594 7.594-3.563-3.563L5.016
            12zm9-14.016C20.11 3 21 3.938 21 5.016v13.97C21 20.062 20.11 21 18.984
            21H5.014C3.89 21 3 20.064 3 18.986V5.015C3 3.94 3.89 3 5.014 3h13.97z"
            />
          </svg>
        </UiIcon>

        <UiIcon v-else>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
              d="M18.984 3C20.062 3 21 3.938 21 5.016v13.97C21 20.062 20.062
            21 18.984 21H5.014C3.938 21 3 20.064 3 18.986V5.015C3 3.94 3.936
            3 5.014 3h13.97zm0 2.016H5.014v13.97h13.97V5.015z"
            />
          </svg>
        </UiIcon>
      </div>

      <div v-if="type === 'basic'" class="ui-select-option-basic">
        {{ option[keys.label] || option }}
      </div>

      <div v-if="type === 'image'" class="ui-select-option-image">
        <div class="ui-select-option-image-object" :style="imageStyle"></div>

        <div
          class="ui-select-option-image-text"
        >
          {{ option[keys.label] }}
        </div>
      </div>
    </slot>
  </li>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'KeenUiSelectOption',
    components: {
      UiIcon,
    },

    props: {
      option: {
        type: [String, Object],
        required: true,
      },
      type: {
        type: String,
        default: 'basic', // 'basic' or 'image'
      },
      multiple: {
        type: Boolean,
        default: false,
      },
      highlighted: {
        type: Boolean,
        default: false,
      },
      selected: {
        type: Boolean,
        default: false,
      },
      keys: {
        type: Object,
        default() {
          return {
            label: 'label',
            image: 'image',
          };
        },
      },
    },

    computed: {
      classes() {
        return [
          `ui-select-option--type-${this.type}`,
          { 'is-highlighted': this.highlighted },
          { 'is-selected': this.selected },
          { 'is-disabled': this.option.disabled },
        ];
      },

      imageStyle() {
        return { 'background-image': 'url(' + this.option[this.keys.image] + ')' };
      },
      selectedStyle() {
        if (this.selected) {
          return {
            color: this.$themeTokens.primary,
          };
        }

        return {};
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import '~keen-ui/src/styles/imports';

  /* stylelint-disable csstree/validator */

  $ui-select-option-checkbox-color: rgba(black, 0.38) !default;

  .ui-select-option {
    @include font-family-noto display: flex;

    align-items: center;
    font-size: $ui-dropdown-item-font-size;
    cursor: pointer;
    user-select: none;

    &.is-selected {
      font-weight: 500;
      color: $brand-primary-color;
      background-color: rgba(black, 0.05);

      .ui-select-option-checkbox {
        color: $brand-primary-color;
      }
    }

    &.is-highlighted:not(.is-disabled) {
      background-color: rgba(black, 0.1);
    }

    &.is-disabled {
      color: $secondary-text-color;
      cursor: default;
      opacity: 0.5;
    }
  }

  .ui-select-option-basic,
  .ui-select-option-image-text {
    @include text-truncation;
  }

  .ui-select-option-image {
    display: flex;
    align-items: center;
  }

  .ui-select-option-image-object {
    width: rem-calc(32px);
    height: rem-calc(32px);
    margin-right: rem-calc(12px);
    background-position: 50%;
    background-size: cover;
    border-radius: 50%;
  }

  .ui-select-option-checkbox {
    margin-right: rem-calc(8px);
    color: $ui-select-option-checkbox-color;
  }

  // ================================================
  // Types
  // ================================================

  .ui-select-option--type-basic {
    padding: rem-calc(6px 12px);
  }

  .ui-select-option--type-image {
    padding: rem-calc(4px 12px);
  }

  /* stylelint-enable */

</style>
