<template>

  <FacilityAppBarPage :title="idCardsPageTitle$()">
    <KPageContainer>
      <KGrid>
        <KGridItem
          :layout12="{ span: 6, alignment: 'left' }"
          :layout8="{ span: 4, alignment: 'left' }"
          :layout4="{ span: 4, alignment: 'left' }"
        >
          <h1>{{ idCardsPageTitle$() }}</h1>
          <p
            class="page-description"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ idCardsPageDescription$() }}
          </p>
        </KGridItem>
        <KGridItem
          :layout12="{ span: 6, alignment: 'right' }"
          :layout8="{ span: 4, alignment: 'right' }"
          :layout4="{ span: 4, alignment: 'right' }"
        >
          <KButton
            :text="printAllCards$()"
            :disabled="filteredLearners.length === 0"
            @click="printAll"
          />
        </KGridItem>
      </KGrid>

      <KTextbox
        v-model="searchQuery"
        :label="searchLearners$()"
        :placeholder="searchLearners$()"
        class="search-box"
      />

      <div
        v-if="loading"
        class="loader-area"
      >
        <KCircularLoader :delay="false" />
      </div>

      <div
        v-else-if="filteredLearners.length === 0"
        class="empty-state"
      >
        <p :style="{ color: $themeTokens.annotation }">{{ noLearnersFound$() }}</p>
      </div>

      <div
        v-else
        class="cards-grid"
        :style="gridStyle"
      >
        <StudentIdCard
          v-for="learner in filteredLearners"
          :key="learner.id"
          :learner="learner"
          :facilityName="facilityName"
          @refresh="onCardRefresh"
          @error="onCardError"
        />
      </div>
    </KPageContainer>

    <!-- Print-all overlay -->
    <div
      v-if="printing"
      class="print-all-overlay"
    >
      <div class="print-page">
        <StudentIdCard
          v-for="(learner, i) in filteredLearners"
          :key="learner.id"
          :learner="learner"
          :facilityName="facilityName"
          class="print-card-item"
        />
      </div>
    </div>
  </FacilityAppBarPage>

</template>


<script>

  import { computed, onMounted, ref } from 'vue';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import StudentIdCard from 'kolibri-common/components/StudentIdCard';
  import KButton from 'kolibri-design-system/lib/buttons-and-links/KButton';
  import KIcon from 'kolibri-design-system/lib/KIcon';
  import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
  import KTextbox from 'kolibri-design-system/lib/KTextbox';
  import KGrid from 'kolibri-design-system/lib/grid/KGrid';
  import KGridItem from 'kolibri-design-system/lib/grid/KGridItem';
  import KPageContainer from 'kolibri-design-system/lib/KPageContainer';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';

  export default {
    name: 'IdCardsPage',
    components: {
      FacilityAppBarPage,
      StudentIdCard,
      KButton,
      KIcon,
      KCircularLoader,
      KTextbox,
      KGrid,
      KGridItem,
      KPageContainer,
    },
    setup() {
      const { facilityId, currentFacilityName } = useFacility();
      const { createSnackbar } = useSnackbar();
      const { windowBreakpoint } = useKResponsiveWindow();

      const {
        idCardsPageTitle$,
        idCardsPageDescription$,
        printAllCards$,
        noLearnersFound$,
        searchLearners$,
      } = qrLoginStrings;

      const learners = ref([]);
      const loading = ref(true);
      const searchQuery = ref('');
      const printing = ref(false);

      const facilityName = computed(() => currentFacilityName.value || '');

      const filteredLearners = computed(() => {
        if (!searchQuery.value.trim()) return learners.value;
        const q = searchQuery.value.toLowerCase();
        return learners.value.filter(
          l =>
            (l.full_name && l.full_name.toLowerCase().includes(q)) ||
            (l.username && l.username.toLowerCase().includes(q)),
        );
      });

      const gridStyle = computed(() => {
        let cols = 1;
        if (windowBreakpoint.value >= 6) cols = 4;
        else if (windowBreakpoint.value >= 4) cols = 3;
        else if (windowBreakpoint.value >= 2) cols = 2;
        return {
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        };
      });

      async function fetchLearners() {
        loading.value = true;
        try {
          const data = await FacilityUserResource.fetchCollection({
            getParams: {
              member_of: facilityId.value,
              user_type: 'learner',
            },
          });
          learners.value = data;
        } catch (err) {
          createSnackbar({
            text: 'Could not load learners',
            autoDismiss: true,
          });
        } finally {
          loading.value = false;
        }
      }

      function onCardRefresh(updatedLearner) {
        const idx = learners.value.findIndex(l => l.id === updatedLearner.id);
        if (idx !== -1) {
          learners.value[idx] = updatedLearner;
        }
      }

      function onCardError(message) {
        createSnackbar({ text: message, autoDismiss: true });
      }

      function printAll() {
        printing.value = true;
        const done = () => {
          printing.value = false;
          window.removeEventListener('afterprint', done);
        };
        window.addEventListener('afterprint', done);
        setTimeout(() => window.print(), 300);
      }

      onMounted(fetchLearners);

      return {
        facilityName,
        learners,
        filteredLearners,
        loading,
        searchQuery,
        printing,
        gridStyle,
        onCardRefresh,
        onCardError,
        printAll,
        idCardsPageTitle$,
        idCardsPageDescription$,
        printAllCards$,
        noLearnersFound$,
        searchLearners$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .page-description {
    margin: 0 0 16px;
    font-size: 14px;
  }

  .search-box {
    max-width: 400px;
    margin-bottom: 24px;
  }

  .loader-area,
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .cards-grid {
    display: grid;
    gap: 16px;
  }

  .print-all-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    overflow: auto;
    background-color: white;
  }

  .print-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 48px;
  }

  @media screen {
    .print-all-overlay {
      display: none;
    }
  }

  @media print {
    .print-card-item {
      page-break-inside: avoid;
    }
  }

</style>
