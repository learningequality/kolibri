<template>

  <SidePanelModal
    data-testid="filter-modal"
    alignment="right"
    closeButtonIconType="close"
    :contentContainerStyleOverrides="{ padding: windowIsSmall ? '0px 4px' : '0px 8px' }"
    @closePanel="$emit('close')"
  >
    <template #header>
      <div class="side-panel-header">
        <KIconButton
          v-if="filterCategoryOpen"
          icon="back"
          :tooltip="coreString('goBackAction')"
          :ariaLabel="coreString('goBackAction')"
          @click="filterPanel.closeCategorySearch()"
        />
        <h1 class="side-panel-title">
          {{ filterCategoryOpen ? chooseACategory$() : allFilters$() }}
        </h1>
      </div>
    </template>
    <SearchFiltersPanel
      ref="filterPanel"
      data-testid="filter-panel"
      :hideKeywords="true"
      :showChannels="showChannels"
      @categorySearchOpen="filterCategoryOpen = $event"
    />
  </SidePanelModal>

</template>


<script>

  import { ref } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import SearchFiltersPanel from 'kolibri-common/components/SearchFiltersPanel';

  export default {
    name: 'SearchFiltersSidePanel',
    components: {
      SidePanelModal,
      SearchFiltersPanel,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const filterPanel = ref(null);
      const filterCategoryOpen = ref(false);
      const { allFilters$, chooseACategory$ } = searchAndFilterStrings;
      return {
        windowIsSmall,
        filterPanel,
        filterCategoryOpen,
        coreString,
        allFilters$,
        chooseACategory$,
      };
    },
    props: {
      showChannels: {
        type: Boolean,
        default: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .side-panel-header {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .side-panel-title {
    margin: 0;
    overflow: hidden;
    font-size: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

</style>
