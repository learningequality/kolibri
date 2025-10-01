<template>

  <div style='display: flex; justify-content: space-between; flex-wrap: wrap;'>
    <div class="search-filter-section">
      <FilterTextbox
        ref="filterTextboxRef"
        v-model="searchTerm"
        :placeholder="coreStrings.searchForUser$()"
        :aria-label="coreStrings.searchForUser$()"
        class="move-down search-box"
      />
      <KRouterLink
        appearance="basic-link"
        :text="numAppliedFilters ? numFilters$({ n: numAppliedFilters }) : filterLabel$()"
        class="filter-button move-down"
        :to="overrideRoute($route, { name: filterPageName })"
      />
      <KButton
        v-if="numAppliedFilters > 0"
        appearance="basic-link"
        :text="clearFiltersLabel$()"
        class="filter-button move-down"
        :style="{
          color: $themePalette.red.v_600 + ' !important',
        }"
        @click="$emit('clearFilters')"
      />
    </div>

    <div style="display: flex;">
      <slot name="userActions">
      </slot>
    </div>

  </div>

</template>


<script>

  import { ref, computed, onBeforeUnmount } from 'vue';
  import pickBy from 'lodash/pickBy';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import debounce from 'lodash/debounce';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import { useRoute, useRouter } from 'vue-router/composables';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import { overrideRoute } from '../../../utils';


  export default {
    name: "UsersTableToolbar",
    components: {
      FilterTextbox
    },
    setup(_, { expose }) {
      const route = useRoute();
      const router = useRouter();
      const filterTextboxRef = ref(null);

      const {
        numFilters$,
        filterLabel$,
        numUsersSelected$,
        clearFiltersLabel$,
      } = bulkUserManagementStrings;

      const emitSearchTerm = value => {
        if (value === '') {
          value = null;
        }
        router.push({
          ...route,
          query: pickBy({
            ...route.query,
            search: value,
            page: null,
          }),
        });
      };
      const debouncedSearchTerm = debounce(emitSearchTerm, 300);

      const searchTerm = computed({
        get() {
          return route.query.search || '';
        },
        set(value) {
          debouncedSearchTerm(value);
        },
      });

      onBeforeUnmount(() => {
        const { query } = route;
        if (query.ordering || query.order || query.page) {
          router.replace({ query: null });
        }
      });

      const focus = () => {
        filterTextboxRef.value?.focus();
      };

      expose({
        focus,
      });

      return {
        overrideRoute,
        // Computed Properties
        searchTerm,
        filterTextboxRef,

        // Strings
        coreStrings,
        numFilters$,
        filterLabel$,
        numUsersSelected$,
        clearFiltersLabel$,
      };
    },
    props: {
      selectedUsers: {
        type: Set,
        required: true,
      },
      numAppliedFilters: {
        type: Number,
        default: 0,
      },
      filterPageName: {
        type: String,
        required: true,
      },
    },
  }

</script>


<style lang="scss" scoped>

  .search-filter-section {
    display: flex;
    justify-content: start;
    // Ensure space enough for keyboard nav outline before table content
    padding-bottom: 0.5em;
  }

  .filter-button {
    padding-top: 10px;
    margin-left: 1em;
  }

  .move-down {
    position: relative;
  }

  .search-box {
    width: 100%;
  }


</style>
