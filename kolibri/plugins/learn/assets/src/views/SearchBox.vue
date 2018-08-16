<template>

  <form
    class="search-box"
    @submit.prevent="search"
    @keydown.esc.prevent="handleEscKey"
  >
    <div class="search-box-row">
      <label class="visuallyhidden" for="searchfield">{{ $tr('searchBoxLabel') }}</label>
      <input
        v-model="searchQuery"
        id="searchfield"
        type="search"
        class="search-input"
        ref="searchInput"
        :placeholder="$tr('searchBoxLabel')"
      >
      <div class="search-buttons-wrapper">
        <UiIconButton
          color="black"
          size="small"
          class="search-clear-button"
          :class="searchQuery === '' ? '' : 'search-clear-button-visble'"
          :ariaLabel="$tr('clearButtonLabel')"
          @click="searchQuery = ''"
        >
          <mat-svg
            name="clear"
            category="content"
          />
        </UiIconButton>

        <div class="search-submit-button-wrapper">
          <UiIconButton
            type="secondary"
            color="white"
            class="search-submit-button"
            :class="{ 'rtl-icon': icon === 'arrow_forward' && isRtl }"
            :ariaLabel="$tr('startSearchButtonLabel')"
            @click="search"
          >
            <mat-svg
              v-if="icon === 'search'"
              name="search"
              category="action"
            />
            <mat-svg
              v-if="icon === 'arrow_forward'"
              name="arrow_forward"
              category="navigation"
            />
          </UiIconButton>
        </div>
      </div>
    </div>
  </form>

</template>


<script>

  import { mapState } from 'vuex';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import { PageNames } from '../constants';

  export default {
    name: 'SearchBox',
    $trs: {
      searchBoxLabel: 'Search',
      clearButtonLabel: 'Clear',
      startSearchButtonLabel: 'Start search',
    },
    components: {
      UiIconButton,
    },
    props: {
      icon: {
        type: String,
        default: 'search',
        validator(val) {
          return ['search', 'arrow_forward'].includes(val);
        },
      },
    },
    data() {
      return {
        searchQuery: this.$store.state.search.searchTerm,
      };
    },
    computed: {
      ...mapState('search', ['searchTerm']),
    },
    watch: {
      searchTerm(val) {
        this.searchQuery = val || '';
      },
    },
    methods: {
      handleEscKey() {
        if (this.searchQuery === '') {
          this.$emit('closeDropdownSearchBox');
        } else {
          this.searchQuery = '';
        }
      },
      search() {
        if (this.searchQuery !== '') {
          this.$router.push({
            name: PageNames.SEARCH,
            query: { query: this.searchQuery },
          });
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .search-box {
    display: table;
    width: 100%;
    max-width: 450px;
    margin-right: 8px;
    background-color: white;
  }

  .search-box-within-action-bar {
    width: 235px;
  }

  .search-box-row {
    display: table-row;
  }

  .search-input {
    display: table-cell;
    width: 100%;
    height: 36px;
    padding: 0;
    padding-left: 8px;
    margin: 0;
    color: $core-text-default;
    vertical-align: middle;
    background-color: white;
    border: 0;

    &::placeholder {
      color: $core-text-annotation;
    }

    // removes the IE clear button
    &::-ms-clear {
      display: none;
    }
  }

  .search-buttons-wrapper {
    display: table-cell;
    width: 78px;
    height: 36px;
    text-align: right;
    vertical-align: middle;
  }

  .search-clear-button {
    width: 24px;
    height: 24px;
    margin-right: 6px;
    margin-left: 6px;
    color: $core-text-default;
    vertical-align: middle;
    visibility: hidden;
  }

  .search-clear-button-visble {
    visibility: visible;
  }

  .search-submit-button {
    width: 36px;
    height: 36px;
    fill: white;
  }

  .search-submit-button-wrapper {
    display: inline-block;
    vertical-align: middle;
    background-color: $core-action-dark;
  }

</style>
