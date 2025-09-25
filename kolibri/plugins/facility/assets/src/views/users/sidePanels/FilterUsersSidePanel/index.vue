<template>

  <SidePanelModal
    hideHeaderBorder
    alignment="right"
    class="bum-side-panel"
    sidePanelWidth="700px"
    :contentContainerStyleOverrides="{ padding: '12px 24px 24px' }"
    :headerContainerStyleOverrides="{ paddingLeft: '24px', paddingRight: '24px' }"
    @closePanel="goBack"
  >
    <template #header>
      <h1 class="side-panel-title">{{ filterUsersLabel$() }}</h1>
    </template>
    <template #default>
      <section class="filter-section">
        <h2 id="user-filter-type-label">{{ coreStrings.userTypeLabel$() }}</h2>
        <SelectableList
          v-model="workingFilters.userTypes"
          :searchable="false"
          :options="userFilterOptions"
          ariaLabelledby="user-filter-type-label"
          :searchLabel="coreStrings.searchLabel$()"
        >
          <template #selectAllLabel>
            <KLabeledIcon :label="allUsersLabel$()">
              <template #icon>
                <KIcon
                  icon="allUsers"
                  class="filter-option-icon"
                />
              </template>
            </KLabeledIcon>
          </template>
          <template #option="{ option }">
            <KLabeledIcon :label="option.label">
              <template #icon>
                <KIcon
                  :icon="option.icon"
                  class="filter-option-icon"
                />
              </template>
            </KLabeledIcon>
          </template>
        </SelectableList>
      </section>
      <section
        v-if="classesOptions.length"
        class="filter-section"
      >
        <h2 id="class-filter-label">{{ coreStrings.classLabel$() }}</h2>
        <SelectableList
          v-model="workingFilters.classes"
          :options="classesOptions"
          ariaLabelledby="class-filter-label"
          :selectAllLabel="coreStrings.allClassesLabel$()"
          :searchLabel="coreStrings.searchLabel$()"
          maxHeight="200px"
        />
      </section>
      <div
        class="section-separator"
        :style="separatorStyles"
      ></div>
      <section class="filter-section">
        <h2>{{ coreStrings.birthYearLabel$() }}</h2>
        <BirthYearRangeSelect
          v-model="workingFilters.birthYear"
          class="birth-year-range-select"
        />
      </section>
      <div
        class="section-separator"
        :style="separatorStyles"
      ></div>
      <template v-if="!hideDateCreatedFilter">
        <section class="filter-section">
          <h2>{{ coreStrings.dateCreated$() }}</h2>
          <KSelect
            v-model="workingFilters.creationDate"
            :label="coreStrings.dateCreated$()"
            :options="creationDateOptions"
          />
        </section>
        <div
          class="section-separator"
          :style="separatorStyles"
        ></div>
      </template>
      <CloseConfirmationGuard
        ref="closeConfirmationGuardRef"
        reverseActionsOrder
        :hasUnsavedChanges="hasUnsavedChanges"
        :title="discardChanges$()"
        :submitText="discardAction$()"
        :cancelText="keepEditingAction$()"
      >
        <KIcon
          icon="infoOutline"
          :color="$themePalette.red.v_600"
        />
        <span :style="{ color: $themePalette.red.v_600 }">
          {{ discardWarning$() }}
        </span>
      </CloseConfirmationGuard>
    </template>
    <template #bottomNavigation>
      <div class="bottom-nav-container">
        <KButton
          :text="coreStrings.clearAction$()"
          @click="resetWorkingFilters"
        />
        <KButton
          primary
          :text="applyFiltersLabel$()"
          @click="applyFilters"
        />
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import { computed, nextTick, ref, toRefs } from 'vue';
  import { useRoute } from 'vue-router/composables';

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { injectPreviousRoute, useGoBack } from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  import SelectableList from '../../../common/SelectableList.vue';
  import useUsersFilters from '../../../../composables/useUsersFilters';
  import { PageNames } from '../../../../constants';
  import { getRootRouteName, overrideRoute } from '../../../../utils';
  import CloseConfirmationGuard from '../../common/CloseConfirmationGuard.vue';
  import BirthYearRangeSelect from './BirthYearRangeSelect.vue';

  export default {
    name: 'FilterUsersSidePanel',
    components: {
      SidePanelModal,
      SelectableList,
      BirthYearRangeSelect,
      CloseConfirmationGuard,
    },
    setup(props) {
      const { classes } = toRefs(props);
      const route = useRoute();
      const prevRoute = injectPreviousRoute();
      const initialFilters = ref(null);
      const filtersApplied = ref(false);
      const goBack = useGoBack({
        getFallbackRoute: () => {
          return overrideRoute(route, {
            name: getRootRouteName(route),
          });
        },
      });

      const {
        workingFilters,
        classesOptions,
        userFilterOptions,
        creationDateOptions,
        applyFilters: _applyFilters,
        resetWorkingFilters,
      } = useUsersFilters({
        classes,
      });

      // Stringify so we get rid of the reactive references
      initialFilters.value = JSON.stringify(workingFilters);

      const hasUnsavedChanges = computed(() => {
        if (filtersApplied.value) {
          return false;
        }
        return initialFilters.value !== JSON.stringify(workingFilters);
      });

      const hideDateCreatedFilter = computed(() => {
        return route.name === PageNames.FILTER_USERS_SIDE_PANEL__NEW_USERS;
      });

      const separatorStyles = {
        height: '1px',
        backgroundColor: themeTokens().fineLine,
        marginBottom: '24px',
      };

      const applyFilters = async () => {
        filtersApplied.value = true;
        await nextTick();
        const nextRouteName = prevRoute.value?.name || getRootRouteName(route);
        _applyFilters({ nextRouteName });
      };

      const {
        filterUsersLabel$,
        allUsersLabel$,
        applyFiltersLabel$,
        discardChanges$,
        keepEditingAction$,
        discardAction$,
        discardWarning$,
      } = bulkUserManagementStrings;

      return {
        // ref and computed properties
        workingFilters,
        coreStrings,
        classesOptions,
        separatorStyles,
        userFilterOptions,
        hasUnsavedChanges,
        creationDateOptions,
        hideDateCreatedFilter,

        // methods
        goBack,
        resetWorkingFilters,
        applyFilters,

        // translation functions
        discardAction$,
        allUsersLabel$,
        discardWarning$,
        discardChanges$,
        filterUsersLabel$,
        applyFiltersLabel$,
        keepEditingAction$,
      };
    },
    props: {
      classes: {
        type: Array,
        default: () => [],
      },
    },
    beforeRouteLeave(to, from, next) {
      this.$refs.closeConfirmationGuardRef?.beforeRouteLeave(to, from, next);
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common';

  .bum-side-panel {
    @include bum-side-panel;
  }

  .filter-section {
    margin-bottom: 24px;
    font-size: 14px;

    h2 {
      margin-top: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .filter-option-icon {
      position: relative;
      font-size: 18px;
    }
  }

  .birth-year-range-select {
    max-width: 316px;
  }

</style>
