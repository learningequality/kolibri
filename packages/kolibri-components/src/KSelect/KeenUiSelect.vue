<template>

  <!--
   This component was forked from the Keen library in order to handle
   dynamic styling.

   The formatting has been changed to match our linters. We may eventually
   want to simply consolidate it with our component and remove any unused
   functionality.
  -->
  <div class="ui-select" :class="classes">
    <input
      v-if="name"
      class="ui-select-hidden-input"

      type="hidden"
      :name="name"

      :value="submittedValue"
    >

    <div v-if="icon || $slots.icon" class="ui-select-icon-wrapper" :style="activeColorStyle">
      <slot name="icon">
        <UiIcon :icon="icon" :style="activeColorStyle" />
      </slot>
    </div>

    <div class="ui-select-content">
      <div
        ref="label"
        class="ui-select-label"

        :tabindex="disabled ? null : '0'"

        @click="toggleDropdown"
        @focus="onFocus"
        @keydown.enter.prevent="openDropdown"
        @keydown.space.prevent="openDropdown"
        @keydown.tab="onBlur"
        @keydown.up.prevent="highlightPreviousOption"
        @keydown.down.prevent="highlightNextOption"
        @keydown.self="highlightQuickMatch"
      >
        <div
          v-if="label || $slots.default"
          class="ui-select-label-text"
          :class="labelClasses"
          :style="activeColorStyle"
        >
          <slot>{{ label }}</slot>
        </div>

        <div class="ui-select-display" :style="activeBorderStyle">
          <div
            class="ui-select-display-value"
            :class="{ 'is-placeholder': !hasDisplayText }"
          >
            {{ hasDisplayText ? displayText : (
              hasFloatingLabel && isLabelInline) ? null : placeholder }}
          </div>

          <UiIcon class="ui-select-dropdown-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6.984 9.984h10.03L12 15z" /></svg>
          </UiIcon>
        </div>

        <transition name="ui-select-transition-fade">
          <div
            v-show="showDropdown"
            ref="dropdown"
            class="ui-select-dropdown"
            :style="{ color: $themeTokens.primary, backgroundColor: $themeTokens.surface }"
            tabindex="-1"
            @keydown.enter.prevent.stop="selectHighlighted"
            @keydown.space.prevent.stop="selectHighlighted"
            @keydown.esc.prevent="closeDropdown()"
            @keydown.tab="onBlur"
            @keydown.up.prevent.stop="highlightPreviousOption"
            @keydown.down.prevent.stop="highlightNextOption"
            @keydown.self="highlightQuickMatch"
          >
            <div
              v-if="hasSearch"

              class="ui-select-search"
              @click.stop

              @keydown.space.stop
            >
              <input
                ref="searchInput"
                v-model="query"
                autocomplete="off"
                class="ui-select-search-input"

                type="text"

                :placeholder="searchPlaceholder"
              >

              <UiIcon class="ui-select-search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path
                    d="M9.516 14.016c2.484 0 4.5-2.016 4.5-4.5s-2.016-4.5-4.5-4.5-4.5 2.016-4.5
                    4.5 2.016 4.5 4.5 4.5zm6 0l4.97
                    4.97-1.5 1.5-4.97-4.97v-.797l-.28-.282c-1.126.984-2.626 1.547-4.22 1.547-3.61
                    0-6.516-2.86-6.516-6.47S5.906 3 9.516 3s6.47 2.906 6.47 6.516c0 1.594-.564
                    3.094-1.548 4.22l.28.28h.798z"
                  />
                </svg>
              </UiIcon>

              <KCircularLoader
                v-show="loading"
                class="ui-select-search-progress"
                :size="20"
                :stroke="4"
              />
            </div>

            <ul
              ref="optionsList"
              class="ui-select-options"
              :style="{ backgroundColor: $themeTokens.surface }"
            >
              <KeenUiSelectOption
                v-for="(option, index) in filteredOptions"
                ref="options"
                :key="index"
                :highlighted="isOptionHighlighted(option)"
                :keys="keys"
                :multiple="multiple"
                :option="option"
                :selected="isOptionSelected(option)"

                :type="type"
                @click.native.stop="selectOption(option)"

                @mouseover.native.stop="onMouseover(option)"
              >
                <slot
                  name="option"

                  :highlighted="isOptionHighlighted(option)"
                  :index="index"
                  :option="option"
                  :selected="isOptionSelected(option)"
                ></slot>
              </KeenUiSelectOption>

              <div v-show="hasNoResults" class="ui-select-no-results">
                <slot name="no-results">
                  No results found
                </slot>
              </div>
            </ul>
          </div>
        </transition>
      </div>

      <div v-if="hasFeedback" class="ui-select-feedback">
        <div v-if="showError" class="ui-select-feedback-text">
          <slot name="error">
            {{ error }}
          </slot>
        </div>

        <div v-else-if="showHelp" class="ui-select-feedback-text">
          <slot name="help">
            {{ help }}
          </slot>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import fuzzysearch from 'fuzzysearch';
  import startswith from 'lodash/startsWith';
  import sortby from 'lodash/sortBy';
  import UiIcon from 'keen-ui/src/UiIcon';

  import { looseIndexOf, looseEqual } from 'keen-ui/src/helpers/util';
  import { scrollIntoView, resetScroll } from 'keen-ui/src/helpers/element-scroll';
  import config from 'keen-ui/src/config';
  import KeenUiSelectOption from './KeenUiSelectOption.vue';

  export default {
    name: 'KeenUiSelect',

    components: {
      UiIcon,
      KeenUiSelectOption,
    },
    props: {
      name: String,
      value: {
        type: [String, Number, Object, Array],
        required: true,
      },
      options: {
        type: Array,
        default() {
          return [];
        },
      },
      placeholder: String,
      icon: String,
      iconPosition: {
        type: String,
        default: 'left', // 'left' or 'right'
      },
      label: String,
      floatingLabel: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        default: 'basic', // 'basic' or 'image'
      },
      multiple: {
        type: Boolean,
        default: false,
      },
      multipleDelimiter: {
        type: String,
        default: ', ',
      },
      hasSearch: {
        type: Boolean,
        default: false,
      },
      searchPlaceholder: {
        type: String,
        default: 'Search',
      },
      filter: Function,
      disableFilter: {
        type: Boolean,
        default: false,
      },
      loading: {
        type: Boolean,
        default: false,
      },
      noResults: {
        type: Boolean,
        default: false,
      },
      keys: {
        type: Object,
        default() {
          return config.data.UiSelect.keys;
        },
      },
      invalid: {
        type: Boolean,
        default: false,
      },
      help: String,
      error: String,
      disabled: {
        type: Boolean,
        default: false,
      },
    },

    data() {
      return {
        query: '',
        isActive: false,
        isTouched: false,
        highlightedOption: null,
        showDropdown: false,
        initialValue: JSON.stringify(this.value),
        quickMatchString: '',
        quickMatchTimeout: null,
      };
    },

    computed: {
      classes() {
        return [
          `ui-select-type-${this.type}`,
          `ui-select-icon-position-${this.iconPosition}`,
          { 'is-active': this.isActive },
          { 'is-invalid': this.invalid },
          { 'is-touched': this.isTouched },
          { 'is-disabled': this.disabled },
          { 'is-multiple': this.multiple },
          { 'has-label': this.hasLabel },
          { 'has-floating-label': this.hasFloatingLabel },
        ];
      },

      labelClasses() {
        return {
          'is-inline': this.hasFloatingLabel && this.isLabelInline,
          'is-floating': this.hasFloatingLabel && !this.isLabelInline,
        };
      },

      hasLabel() {
        return Boolean(this.label) || Boolean(this.$slots.default);
      },

      hasFloatingLabel() {
        return this.hasLabel && this.floatingLabel;
      },

      isLabelInline() {
        return this.value.length === 0 && !this.isActive;
      },

      hasFeedback() {
        return Boolean(this.help) || Boolean(this.error) || Boolean(this.$slots.error);
      },

      showError() {
        return this.invalid && (Boolean(this.error) || Boolean(this.$slots.error));
      },

      showHelp() {
        return !this.showError && (Boolean(this.help) || Boolean(this.$slots.help));
      },

      filteredOptions() {
        if (this.disableFilter) {
          return this.options;
        }

        return this.options.filter((option, index) => {
          if (this.filter) {
            return this.filter(option, this.query);
          }

          return this.defaultFilter(option, index);
        });
      },

      displayText() {
        if (this.multiple) {
          if (this.value.length > 0) {
            return this.value
              .map(value => value[this.keys.label] || value)
              .join(this.multipleDelimiter);
          }

          return '';
        }

        return this.value ? this.value[this.keys.label] || this.value : '';
      },

      hasDisplayText() {
        return Boolean(this.displayText.length);
      },

      hasNoResults() {
        if (this.loading || this.query.length === 0) {
          return false;
        }

        return this.disableFilter ? this.noResults : this.filteredOptions.length === 0;
      },

      submittedValue() {
        // Assuming that if there is no name, then there's no
        // need to computed the submittedValue
        if (!this.name || !this.value) {
          return;
        }

        if (Array.isArray(this.value)) {
          return this.value.map(option => option[this.keys.value] || option).join(',');
        }

        return this.value[this.keys.value] || this.value;
      },

      // Returns the index of the currently highlighted option
      highlightedIndex() {
        return this.options.findIndex(option => looseEqual(this.highlightedOption, option));
      },

      // Returns an array containing the options and extra annotations
      annotatedOptions() {
        const options = JSON.parse(JSON.stringify(this.options));
        return options.map((option, index) => {
          // If not object, create object
          if (typeof option !== 'object') {
            option = {
              [this.keys.value]: option,
              [this.keys.label]: option,
            };
          }

          // Add index to object
          option.index = index;

          // Check if valid prev/next
          if (!option.disabled) {
            if (index < this.highlightedIndex) {
              option.validPreviousOption = true;
            } else if (index > this.highlightedIndex) {
              option.validNextOption = true;
            }
          }

          // Check if matches
          option.startsWith = startswith(
            option[this.keys.label].toLowerCase(),
            this.quickMatchString.toLowerCase()
          );

          return option;
        });
      },
      activeColorStyle() {
        if (this.isActive) {
          return {
            color: this.$themeTokens.primary,
          };
        }

        return {};
      },
      activeBorderStyle() {
        if (this.isActive) {
          return {
            borderBottomColor: this.$themeTokens.primary,
          };
        }

        return {};
      },
    },

    watch: {
      filteredOptions() {
        this.highlightedOption = this.filteredOptions[0];
        resetScroll(this.$refs.optionsList);
      },

      showDropdown() {
        if (this.showDropdown) {
          this.onOpen();
          this.$emit('dropdown-open');
        } else {
          this.onClose();
          this.$emit('dropdown-close');
        }
      },

      query() {
        this.$emit('query-change', this.query);
      },

      quickMatchString(string) {
        if (string) {
          if (this.quickMatchTimeout) {
            clearTimeout(this.quickMatchTimeout);
            this.quickMatchTimeout = null;
          }
          this.quickMatchTimeout = setTimeout(() => {
            this.quickMatchString = '';
          }, 500);
        }
      },
    },

    created() {
      if (!this.value || this.value === '') {
        this.setValue(null);
      }
    },

    mounted() {
      document.addEventListener('click', this.onExternalClick);
    },

    beforeDestroy() {
      document.removeEventListener('click', this.onExternalClick);
    },

    methods: {
      setValue(value) {
        value = value ? value : this.multiple ? [] : '';

        this.$emit('input', value);
        this.$emit('change', value);
      },

      // Highlights the matching option on key input
      highlightQuickMatch(event) {
        // https://github.com/ccampbell/mousetrap/blob/master/mousetrap.js#L39
        const specialKeyCodes = [
          8,
          9,
          13,
          16,
          17,
          18,
          20,
          27,
          32,
          33,
          34,
          35,
          36,
          37,
          38,
          39,
          40,
          45,
          46,
          91,
          93,
          224,
        ];
        const keyCode = event.keyCode;
        if (specialKeyCodes.includes(keyCode)) {
          return;
        }

        const character = event.key.toString();
        if (this.hasSearch) {
          this.openDropdown();
        } else {
          this.quickMatchString += character;
          let matchingItems = this.annotatedOptions.filter(
            option => option.startsWith && !option.disabled
          );
          if (matchingItems.length !== 0) {
            matchingItems = sortby(matchingItems, [this.keys.label]);
            matchingItems = sortby(matchingItems, item => item[this.keys.label].length);
            this.highlightOption(this.options[matchingItems[0].index]);
          }
        }
      },

      // Highlights the previous valid option
      highlightPreviousOption() {
        const options = this.annotatedOptions;
        let validPreviousOptionIndex = -1;
        for (let i = 0; i < options.length; i++) {
          if (options[i].validPreviousOption) {
            validPreviousOptionIndex = i;
          }
        }
        if (validPreviousOptionIndex !== -1) {
          this.highlightOption(this.options[validPreviousOptionIndex]);
        }
      },

      // Highlights the next valid option
      highlightNextOption() {
        const options = this.annotatedOptions;
        const validNextOptionIndex = options.findIndex(option => option.validNextOption);
        if (validNextOptionIndex !== -1) {
          this.highlightOption(this.options[validNextOptionIndex]);
        }
      },

      // Highlights the option
      highlightOption(option, options = { autoScroll: true }) {
        if (
          !option ||
          option.disabled ||
          looseEqual(this.highlightedOption, option) ||
          this.$refs.options.length === 0
        ) {
          return;
        }

        this.highlightedOption = option;
        this.openDropdown();

        if (options.autoScroll) {
          const index = this.filteredOptions.findIndex(option =>
            looseEqual(this.highlightedOption, option)
          );
          const optionToScrollTo = this.$refs.options[index];
          if (optionToScrollTo) {
            this.scrollOptionIntoView(optionToScrollTo.$el);
          }
        }
      },

      selectHighlighted() {
        if (
          this.highlightedOption &&
          !this.highlightedOption.disabled &&
          this.$refs.options.length > 0
        ) {
          this.selectOption(this.highlightedOption);
        }
      },

      selectOption(option, options = { autoClose: true }) {
        if (!option || option.disabled) {
          return;
        }

        const shouldSelect = this.multiple && !this.isOptionSelected(option);

        if (this.multiple) {
          this.updateOption(option, { select: shouldSelect });
        } else {
          this.setValue(option);
        }

        this.$emit('select', option, {
          selected: this.multiple ? shouldSelect : true,
        });

        this.clearQuery();

        if (!this.multiple && options.autoClose) {
          this.closeDropdown();
        }
      },

      // Checks if option is highlighted
      isOptionHighlighted(option) {
        return looseEqual(this.highlightedOption, option);
      },

      isOptionSelected(option) {
        if (this.multiple) {
          return looseIndexOf(this.value, option) > -1;
        }
        return looseEqual(this.value, option);
      },

      updateOption(option, options = { select: true }) {
        let value = [];
        let updated = false;
        const i = looseIndexOf(this.value, option);

        if (options.select && i < 0) {
          value = this.value.concat(option);
          updated = true;
        }

        if (!options.select && i > -1) {
          value = this.value.slice(0, i).concat(this.value.slice(i + 1));
          updated = true;
        }

        if (updated) {
          this.setValue(value);
        }
      },

      defaultFilter(option) {
        const query = this.query.toLowerCase();
        let text = option[this.keys.label] || option;

        if (typeof text === 'string') {
          text = text.toLowerCase();
        }

        return fuzzysearch(query, text);
      },

      clearQuery() {
        this.query = '';
      },

      toggleDropdown() {
        this[this.showDropdown ? 'closeDropdown' : 'openDropdown']();
      },

      openDropdown() {
        if (this.disabled) {
          return;
        }

        if (this.highlightedIndex === -1) {
          this.highlightNextOption();
        }

        this.showDropdown = true;

        // IE: clicking label doesn't focus the select element
        // to set isActive to true
        if (!this.isActive) {
          this.isActive = true;
        }
      },

      closeDropdown(options = { autoBlur: false }) {
        this.showDropdown = false;
        this.query = '';
        if (!this.isTouched) {
          this.isTouched = true;
          this.$emit('touch');
        }

        if (options.autoBlur) {
          this.isActive = false;
        } else {
          this.$refs.label.focus();
        }
      },

      onMouseover(option) {
        if (this.showDropdown) {
          this.highlightOption(option, { autoScroll: false });
        }
      },

      onFocus(e) {
        if (this.isActive) {
          return;
        }

        this.isActive = true;
        this.$emit('focus', e);
      },

      onBlur(e) {
        this.isActive = false;
        this.$emit('blur', e);

        if (this.showDropdown) {
          this.closeDropdown({ autoBlur: true });
        }
      },

      onOpen() {
        this.highlightedOption = this.multiple ? null : this.value;
        this.$nextTick(() => {
          this.$refs[this.hasSearch ? 'searchInput' : 'dropdown'].focus();
          const selectedOption = this.$refs.optionsList.querySelector('.is-selected');
          if (selectedOption) {
            this.scrollOptionIntoView(selectedOption);
          } else {
            this.scrollOptionIntoView(
              this.$refs.optionsList.querySelector('.ui-select-option:not(.is-disabled)')
            );
          }
        });
      },

      onClose() {
        this.highlightedOption = this.multiple ? null : this.value;
      },

      onExternalClick(e) {
        if (!this.$el.contains(e.target)) {
          if (this.showDropdown) {
            this.closeDropdown({ autoBlur: true });
          } else if (this.isActive) {
            this.isActive = false;
          }
        }
      },

      scrollOptionIntoView(optionEl) {
        scrollIntoView(optionEl, {
          container: this.$refs.optionsList,
          marginTop: 180,
        });
      },

      /**
       * @public
       */
      reset() {
        this.setValue(JSON.parse(this.initialValue));
        this.clearQuery();
        this.resetTouched();
        this.highlightedOption = null;
      },

      resetTouched(options = { touched: false }) {
        this.isTouched = options.touched;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import '~keen-ui/src/styles/imports';

  /* stylelint-disable csstree/validator */

  .ui-select {
    @include font-family-noto;

    position: relative;
    display: flex;
    align-items: flex-start;
    margin-bottom: $ui-input-margin-bottom;
    outline: none;

    &:hover:not(.is-disabled) {
      .ui-select-label-text {
        color: $ui-input-label-color--hover;
      }

      .ui-select-display {
        border-bottom-color: $ui-input-border-color--hover;
      }

      .ui-select-dropdown-button {
        color: $ui-input-button-color--hover;
      }
    }

    &.is-active:not(.is-disabled) {
      .ui-select-display {
        border-bottom-width: $ui-input-border-width--active;
      }
    }

    &.has-floating-label {
      .ui-select-label-text {
        // Behaves like a block, but width is the width of its content.
        // Needed here so label doesn't overflow parent when scaled.
        display: table;

        &.is-inline {
          color: $ui-input-label-color; // So the hover styles don't override it
          cursor: pointer;
          transform: translateY($ui-input-label-top--inline) scale(1.1);
        }

        &.is-floating {
          transform: translateY(0) scale(1);
        }
      }
    }

    &.has-label {
      .ui-select-icon-wrapper {
        padding-top: $ui-input-icon-margin-top--with-label;
      }

      .ui-select-dropdown-button {
        top: $ui-input-button-margin-top--with-label;
      }
    }

    &:not(.is-multiple) {
      .ui-select-display {
        height: $ui-input-height;
        line-height: 1;
      }
    }

    &.is-multiple {
      .ui-select-display {
        padding-top: rem-calc(4px);
        padding-bottom: rem-calc(4px);
        line-height: 1.4;
      }
    }

    &.is-invalid:not(.is-disabled) {
      .ui-select-label-text,
      .ui-select-icon-wrapper .ui-icon {
        color: $ui-input-label-color--invalid;
      }

      .ui-select-display {
        border-bottom-color: $ui-input-border-color--invalid;
      }

      .ui-select-feedback {
        color: $ui-input-feedback-color--invalid;
      }
    }

    &.is-disabled {
      .ui-select-display {
        color: $ui-input-text-color--disabled;
        cursor: default;
        border-bottom-style: $ui-input-border-style--disabled;
        border-bottom-width: $ui-input-border-width--active;
      }

      .ui-select-dropdown-button,
      .ui-select-display-value.is-placeholder {
        color: $ui-input-text-color--disabled;
        opacity: $ui-input-button-opacity--disabled;
      }

      .ui-select-icon-wrapper .ui-icon {
        opacity: $ui-input-icon-opacity--disabled;
      }

      .ui-select-feedback {
        opacity: $ui-input-feedback-opacity--disabled;
      }
    }
  }

  .ui-select-label {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    margin: 0;
    outline: none;
  }

  .ui-select-icon-wrapper {
    flex-shrink: 0;
    padding-top: $ui-input-icon-margin-top;
    margin-right: $ui-input-icon-margin-right;

    .ui-icon {
      color: $ui-input-icon-color;
    }
  }

  .ui-select-content {
    flex-grow: 1;
  }

  .ui-select-label-text {
    margin-bottom: $ui-input-label-margin-bottom;
    font-size: $ui-input-label-font-size;
    line-height: $ui-input-label-line-height;
    color: $ui-input-label-color;
    cursor: default;
    transition: color 0.1s ease, transform 0.2s ease;
    transform-origin: left;
  }

  .ui-select-display {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0;
    font-size: $ui-input-text-font-size;
    font-weight: normal;
    color: $ui-input-text-color;
    cursor: pointer;
    user-select: none;
    border: 0;
    border-bottom-color: $ui-input-border-color;
    border-bottom-style: solid;
    border-bottom-width: $ui-input-border-width;
    transition: border 0.1s ease;
  }

  .ui-select-display-value {
    position: relative;
    top: 2px;
    flex-grow: 1;
    height: 22px; // height and top help prevent descender clipping
    overflow: hidden;
    text-overflow: ellipsis;

    // if inline-block
    white-space: nowrap;

    &.is-placeholder {
      color: $hint-text-color;
    }
  }

  .ui-select-dropdown-button {
    margin-right: rem-calc(-4px);
    margin-left: auto;
    font-size: $ui-input-button-size;
    color: $ui-input-button-color;
  }

  .ui-select-dropdown {
    position: absolute;
    z-index: $z-index-dropdown;
    display: block;
    width: 100%;
    min-width: rem-calc(180px);
    padding: 0;
    margin: 0;
    margin-bottom: rem-calc(8px);
    list-style-type: none;
    outline: none;
    box-shadow: 1px 2px 8px $md-grey-600;
  }

  .ui-select-search-input {
    @include font-family-noto;

    width: 100%;
    height: $ui-input-height + rem-calc(4px);
    padding: rem-calc(0 12px);
    padding-left: rem-calc(40px);
    font-size: $ui-input-text-font-size - rem-calc(1px);
    font-weight: normal;
    color: $ui-input-text-color;
    cursor: auto;
    background: none;
    border: 0;
    border-bottom-color: $ui-input-border-color;
    border-bottom-style: solid;
    border-bottom-width: $ui-input-border-width;
    border-radius: 0;
    outline: none;
    transition: border 0.1s ease;

    // Hide Edge and IE input clear button
    &::-ms-clear {
      display: none;
    }

    &:focus + .ui-select-search-icon {
      color: $ui-input-label-color--active;
    }
  }

  .ui-select-search-icon,
  .ui-select-search-progress {
    position: absolute;
    top: rem-calc(8px);
  }

  .ui-select-search-icon {
    left: rem-calc(12px);
    font-size: rem-calc(20px);
    color: $ui-input-icon-color;
  }

  .ui-select-search-progress {
    right: rem-calc(12px);
  }

  .ui-select-options {
    position: relative;
    display: block;
    min-width: 100%;
    max-height: rem-calc(256px);
    padding: 0;
    margin: 0;
    overflow-y: auto;
    color: $primary-text-color;
    list-style-type: none;
  }

  .ui-select-no-results {
    width: 100%;
    padding: rem-calc(8px 12px);
    font-size: rem-calc(14px);
    color: $secondary-text-color;
  }

  .ui-select-feedback {
    position: relative;
    padding-top: $ui-input-feedback-padding-top;
    margin: 0;
    font-size: $ui-input-feedback-font-size;
    line-height: $ui-input-feedback-line-height;
    color: $ui-input-feedback-color;
  }

  // ================================================
  // Icon Positions
  // ================================================

  .ui-select-icon-position-right {
    .ui-select-icon-wrapper {
      order: 1;
      margin-right: 0;
      margin-left: rem-calc(8px);
    }
  }

  // ================================================
  // Transitions
  // ================================================

  .ui-select-transition-fade-enter-active,
  .ui-select-transition-fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .ui-select-transition-fade-enter,
  .ui-select-transition-fade-leave-active {
    opacity: 0;
  }

  /* stylelint-enable */

</style>
