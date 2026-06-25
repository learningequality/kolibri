<template>

  <form
    class="search-box"
    role="search"
    @submit.prevent="updateSearchQuery"
  >
    <div
      class="search-box-row"
      role="presentation"
      :style="{
        backgroundColor: $themeTokens.surface,
        borderColor: $themePalette.grey.v_400,
        maxWidth: maxWidth,
        fontSize: '16px',
      }"
      @keydown.esc.prevent="handleEscKey"
    >
      <label
        :for="id"
        class="search-label"
      >
        <span class="visuallyhidden">{{ coreString('searchLabel') }}</span>
        <input
          :id="id"
          ref="searchInput"
          v-model.trim="newSearchTerm"
          type="search"
          :disabled="disabled"
          class="search-input"
          :class="$computedClass(searchInputStyle)"
          dir="auto"
          :placeholder="computedPlaceholder"
        >
      </label>
      <div class="search-buttons-wrapper">
        <KIconButton
          icon="clear"
          :color="$themeTokens.text"
          size="small"
          class="search-clear-button"
          :class="searchInputValue === '' ? '' : 'search-clear-button-visible'"
          :ariaLabel="coreString('clearAction')"
          @click="handleClickClear"
        />
        <KButton
          :disabled="searchBarDisabled"
          :primary="true"
          :appearanceOverrides="{ minWidth: '36px', padding: 0 }"
          :aria-label="coreString('startSearchButtonLabel')"
          type="submit"
        >
          <template #icon>
            <KIcon
              :icon="icon"
              :style="{ width: '24px', height: '24px' }"
              :color="$themeTokens.textInverted"
            />
          </template>
        </KButton>
      </div>
    </div>
  </form>

</template>


<script>

  import commonCoreStrings, { coreString } from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'SearchBox',
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        windowBreakpoint,
      };
    },
    props: {
      icon: {
        type: String,
        default: 'search',
        validator(val) {
          return ['search', 'forward'].includes(val);
        },
      },
      id: {
        type: String,
        default: 'searchfield',
      },
      placeholder: {
        type: String,
        default: null,
      },
      value: {
        type: String,
        default: null,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      maxWidth: {
        type: String,
        default: '450px',
      },
    },
    data() {
      return {
        searchInputValue: '',
      };
    },
    computed: {
      newSearchTerm: {
        get() {
          return this.searchInputValue === null ? this.currentSearchTerm : this.searchInputValue;
        },
        set(value) {
          this.searchInputValue = value || '';
        },
      },
      currentSearchTerm() {
        return this.value !== null ? this.value : this.$route.query.keywords;
      },
      searchBarDisabled() {
        return this.searchInputValue === '' || this.disabled;
      },
      searchInputStyle() {
        return {
          '::placeholder': {
            color: this.$themeTokens.annotation,
          },
          color: this.$themeTokens.text,
          backgroundColor: 'transparent',
          textAlign: this.isRtl ? 'right' : '',
        };
      },
      computedPlaceholder() {
        if ([3, 4].includes(this.windowBreakpoint)) {
          return this.placeholder || this.$tr('find');
        }
        return this.placeholder || coreString('searchLabel');
      },
    },
    watch: {
      value(current) {
        this.searchInputValue = current || '';
      },
    },
    created() {
      this.searchInputValue = this.value;
    },
    methods: {
      /**
       * Moves keyboard focus to the search input element.
       * @public
       */
      focusSearchBox() {
        this.$refs.searchInput.focus();
      },
      clearInput() {
        this.searchInputValue = '';
        this.updateSearchQuery();
      },
      handleEscKey() {
        if (this.searchInputValue === '') {
          this.$emit('closeDropdownSearchBox');
        } else {
          this.clearInput();
        }
      },
      handleClickClear() {
        this.clearInput();
        this.$refs.searchInput.focus();
      },
      updateSearchQuery() {
        this.$emit('change', this.searchInputValue);
      },
    },
    $trs: {
      find: 'Find',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .search-box {
    margin-right: 8px;
  }

  .search-box-within-action-bar {
    width: 235px;
  }

  .search-box-row {
    display: flex;
    align-items: center;
    width: 100%;
    border: solid 1px;
    border-radius: $radius;
  }

  .search-label {
    flex: 1;
    min-width: 0;
  }

  .search-input {
    display: block;
    width: 100%;
    height: 36px;
    padding: 0;
    padding-left: 8px;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border: 0;

    // removes the IE clear button
    &::-ms-clear {
      display: none;
    }

    // removes the Chrome clear button
    &::-webkit-search-cancel-button {
      appearance: none;
    }
  }

  .search-buttons-wrapper {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: flex-end;
    width: 80px;
    height: 36px;
  }

  .search-clear-button {
    width: 24px;
    height: 24px;
    margin-right: 6px;
    vertical-align: middle;
    visibility: hidden;
  }

  .search-clear-button-visible {
    visibility: visible;
  }

  .filter-icon {
    position: absolute;
    top: 50%;
    bottom: 50%;
    margin-left: 12px;
    transform: translate(-50%, -50%);
  }

  .filter:nth-of-type(1) {
    margin-right: 16px;
  }

  .filter {
    margin-bottom: 16px;
    margin-left: 28px;
  }

  .filters {
    margin-top: 24px;
  }

  .ib {
    position: relative;
    display: inline-block;
  }

</style>
