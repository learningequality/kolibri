<template>

  <form
    class="search-box"
    @submit.prevent="updateSearchQuery"
    @keydown.esc.prevent="handleEscKey"
  >
    <div
      class="search-box-row"
      :style="{
        backgroundColor: $themeTokens.surface,
        borderColor: $themePalette.grey.v_400,
        fontSize: '16px',
      }"
    >
      <label
        class="visuallyhidden"
        for="searchfield"
      >{{ coreString('searchLabel') }}</label>
      <input
        :id="id"
        ref="searchInput"
        v-model.trim="newSearchTerm"
        type="search"
        class="search-input"
        :class="$computedClass(searchInputStyle)"
        dir="auto"
        :placeholder="coreString(placeholder)"
      >
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
              :style="{ width: '24px', height: '24px', top: '7px' }"
              :color="$themeTokens.textInverted"
            />
          </template>
        </KButton>
      </div>
    </div>
  </form>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveElementMixin from 'kolibri-design-system/lib/KResponsiveElementMixin';

  export default {
    name: 'SearchBox',
    mixins: [commonCoreStrings, responsiveElementMixin],
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
        default: 'searchLabel',
      },
      value: {
        type: String,
        default: null,
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
        // Disable the search bar if it has been cleared or has not been changed
        return this.searchInputValue === '';
      },
      searchInputStyle() {
        return {
          '::placeholder': {
            color: this.$themeTokens.annotation,
          },
          color: this.$themeTokens.text,
          textAlign: this.isRtl ? 'right' : '',
        };
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
    display: table;
    width: 100%;
    max-width: 450px;
    border: solid 1px;
    border-radius: $radius;
  }

  .search-input {
    display: table-cell;
    width: 100%;
    height: 36px;
    padding: 0;
    padding-left: 8px;
    margin: 0;
    vertical-align: middle;
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
    display: table-cell;
    width: 80px;
    height: 36px;
    text-align: right;
    vertical-align: middle;
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
