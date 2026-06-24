<template>

  <FacilityAppBarPage :title="idCardsPageTitle$()">
    <KPageContainer>
      <!-- Header -->
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
          class="header-actions"
        >
          <KButton
            appearance="basic-link"
            :text="cardBrandImage ? replaceLogo$() : uploadLogo$()"
            class="logo-btn"
            @click="triggerLogoInput"
          />
          <input
            ref="logoInputRef"
            type="file"
            accept="image/*"
            class="hidden-input"
            @change="onLogoSelected"
          >
          <KButton
            :text="generateQrCodes$()"
            :disabled="learnersMissingTokenCount === 0 || generating"
            class="generate-btn"
            @click="generateQrCodes"
          />
          <KButton
            :text="printSelected$({ count: selectedCount })"
            :disabled="selectedCount === 0 || generating"
            class="print-btn"
            @click="printSelected"
          />
          <KButton
            :text="printAllCards$()"
            :disabled="filteredLearners.length === 0 || generating"
            :primary="true"
            @click="printAll"
          />
        </KGridItem>
      </KGrid>

      <!-- Bulk generate progress -->
      <div
        v-if="generating"
        class="generate-status"
        :style="{ color: $themeTokens.annotation }"
      >
        <KCircularLoader
          :size="16"
          :delay="false"
        />
        <span>{{ generatingQrCodes$() }}</span>
      </div>

      <!-- Select controls -->
      <div class="select-controls">
        <KButton
          appearance="basic-link"
          :text="selectAll$()"
          @click="selectAll"
        />
        <KButton
          appearance="basic-link"
          :text="deselectAll$()"
          @click="deselectAll"
        />
        <span
          v-if="selectedCount > 0"
          class="selected-count"
          :style="{ color: $themeTokens.annotation }"
        >{{ selectedCount$({ count: selectedCount }) }}</span>
      </div>

      <!-- Search -->
      <KTextbox
        v-model="searchQuery"
        :label="searchLearners$()"
        :placeholder="searchLearners$()"
        class="search-box"
      />

      <!-- Loading -->
      <div
        v-if="loading"
        class="loader-area"
      >
        <KCircularLoader :delay="false" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredLearners.length === 0"
        class="empty-state"
      >
        <p :style="{ color: $themeTokens.annotation }">{{ noLearnersFound$() }}</p>
      </div>

      <!-- Cards grid -->
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
          :selectable="true"
          :selected="selectedIds.has(learner.id)"
          @refresh="onCardRefresh"
          @error="onCardError"
          @select="toggleSelect"
        />
      </div>
    </KPageContainer>

    <!-- Print overlay (visible only during printing) -->
    <div
      v-if="printing"
      class="print-overlay"
    >
      <PrintableIdCards
        :learners="printLearners"
        :brandImage="cardBrandImage"
      />
    </div>
  </FacilityAppBarPage>

</template>


<script>

  import { computed, onMounted, ref, watch } from 'vue';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
  import StudentIdCard from 'kolibri-common/components/StudentIdCard';
  import PrintableIdCards from 'kolibri-common/components/PrintableIdCards';
  import KButton from 'kolibri-design-system/lib/buttons-and-links/KButton';
  import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
  import KTextbox from 'kolibri-design-system/lib/KTextbox';

  import KGrid from 'kolibri-design-system/lib/grids/KGrid';
  import KGridItem from 'kolibri-design-system/lib/grids/KGridItem';
  import KPageContainer from 'kolibri-design-system/lib/KPageContainer';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useFacility from 'kolibri-common/composables/useFacility';
  import useTaskPolling from 'kolibri-common/composables/useTaskPolling';
  import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
  import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';
  import FacilityAppBarPage from '../FacilityAppBarPage';

  const LOGO_WIDTH = 200;
  const LOGO_HEIGHT = 60;
  const LOGO_QUALITY = 0.85;

  function resizeLogo(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = LOGO_WIDTH;
        canvas.height = LOGO_HEIGHT;
        const ctx = canvas.getContext('2d');
        const ratio = Math.max(LOGO_WIDTH / img.width, LOGO_HEIGHT / img.height);
        const newW = img.width * ratio;
        const newH = img.height * ratio;
        const x = (LOGO_WIDTH - newW) / 2;
        const y = (LOGO_HEIGHT - newH) / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, LOGO_WIDTH, LOGO_HEIGHT);
        ctx.drawImage(img, x, y, newW, newH);
        resolve(canvas.toDataURL('image/png', LOGO_QUALITY));
      };
      img.onerror = err => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  export default {
    name: 'IdCardsPage',
    components: {
      FacilityAppBarPage,
      StudentIdCard,
      PrintableIdCards,
      KButton,
      KCircularLoader,
      KTextbox,
      KGrid,
      KGridItem,
      KPageContainer,
    },
    setup() {
      const { facilityId, facilityConfig, fetchFacilityConfig } = useFacility();
      const { createSnackbar } = useSnackbar();
      const { windowBreakpoint } = useKResponsiveWindow();

      const {
        idCardsPageTitle$,
        idCardsPageDescription$,
        printAllCards$,
        printSelected$,
        selectAll$,
        deselectAll$,
        selectedCount$,
        noLearnersFound$,
        couldNotLoadLearners$,
        searchLearners$,
        uploadLogo$,
        replaceLogo$,
        logoUploaded$,
        logoUploadFailed$,
        generateQrCodes$,
        generatingQrCodes$,
        qrCodesGenerated$,
        qrCodeGenerationFailed$,
      } = qrLoginStrings;

      const learners = ref([]);
      const loading = ref(true);
      const searchQuery = ref('');
      const selectedIds = ref(new Set());
      const printing = ref(false);
      const printLearners = ref([]);
      const cardBrandImage = ref(null);
      const logoInputRef = ref(null);

      const facilityName = computed(() => facilityConfig.value?.description || '');

      const filteredLearners = computed(() => {
        if (!searchQuery.value.trim()) return learners.value;
        const q = searchQuery.value.toLowerCase();
        return learners.value.filter(
          l =>
            (l.full_name && l.full_name.toLowerCase().includes(q)) ||
            (l.username && l.username.toLowerCase().includes(q)),
        );
      });

      const selectedCount = computed(() => selectedIds.value.size);

      const { tasks: facilityTasks } = useTaskPolling('facility_task');
      const generateTaskId = ref(null);
      const generating = ref(false);

      // Learners in the current filtered view that don't yet have a QR token;
      // these are the only ones the bulk-assign task will act on.
      const learnersMissingTokenCount = computed(
        () => filteredLearners.value.filter(l => !l.qr_login_token).length,
      );

      const generateTask = computed(() => {
        if (!generateTaskId.value) return null;
        return facilityTasks.value.find(t => t.id === generateTaskId.value) || null;
      });

      watch(generateTask, task => {
        if (!task) return;
        if (task.status === TaskStatuses.FAILED) {
          generating.value = false;
          generateTaskId.value = null;
          createSnackbar({ text: qrCodeGenerationFailed$(), autoDismiss: true });
        } else if (task.status === TaskStatuses.COMPLETED) {
          generating.value = false;
          generateTaskId.value = null;
          createSnackbar({ text: qrCodesGenerated$(), autoDismiss: true });
          fetchLearners();
        }
      });

      const gridStyle = computed(() => {
        let cols = 1;
        if (windowBreakpoint.value >= 6) cols = 4;
        else if (windowBreakpoint.value >= 4) cols = 3;
        else if (windowBreakpoint.value >= 2) cols = 2;
        return { gridTemplateColumns: `repeat(${cols}, 1fr)` };
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
          createSnackbar({ text: couldNotLoadLearners$(), autoDismiss: true });
        } finally {
          loading.value = false;
        }
      }

      function toggleSelect(id) {
        const next = new Set(selectedIds.value);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        selectedIds.value = next;
      }

      function selectAll() {
        selectedIds.value = new Set(filteredLearners.value.map(l => l.id));
      }

      function deselectAll() {
        selectedIds.value = new Set();
      }

      function onCardRefresh(updatedLearner) {
        const idx = learners.value.findIndex(l => l.id === updatedLearner.id);
        if (idx !== -1) learners.value.splice(idx, 1, updatedLearner);
      }

      function onCardError(message) {
        createSnackbar({ text: message, autoDismiss: true });
      }

      function doPrint(list) {
        printLearners.value = list;
        printing.value = true;
        const done = () => {
          printing.value = false;
          window.removeEventListener('afterprint', done);
        };
        window.addEventListener('afterprint', done);
        setTimeout(() => window.print(), 400);
      }

      function printSelected() {
        const selected = learners.value.filter(l => selectedIds.value.has(l.id));
        doPrint(selected);
      }

      function printAll() {
        doPrint(filteredLearners.value);
      }

      async function generateQrCodes() {
        // Assign is idempotent and only affects learners missing a token, so we
        // pass every learner in the current filtered view; those that already
        // have a token are no-ops. The work runs as a background task.
        const ids = filteredLearners.value.filter(l => !l.qr_login_token).map(l => l.id);
        if (ids.length === 0) return;
        generating.value = true;
        try {
          const { data } = await FacilityUserResource.assignQrTokens(ids);
          if (data && data.task && data.task.id) {
            generateTaskId.value = data.task.id;
          } else {
            generating.value = false;
          }
        } catch (err) {
          generating.value = false;
          createSnackbar({ text: qrCodeGenerationFailed$(), autoDismiss: true });
        }
      }

      // ---- Logo upload ----

      function triggerLogoInput() {
        if (logoInputRef.value) logoInputRef.value.click();
      }

      async function onLogoSelected(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        try {
          const dataUrl = await resizeLogo(file);
          const extraFields = {
            ...(facilityConfig.value.extra_fields || {}),
            card_brand_image: dataUrl,
          };
          await FacilityDatasetResource.saveModel({
            id: facilityConfig.value.id,
            data: { extra_fields: extraFields },
          });
          cardBrandImage.value = dataUrl;
          await fetchFacilityConfig();
          createSnackbar({ text: logoUploaded$(), autoDismiss: true });
        } catch (err) {
          createSnackbar({ text: logoUploadFailed$(), autoDismiss: true });
        }
      }

      onMounted(async () => {
        cardBrandImage.value = facilityConfig.value?.extra_fields?.card_brand_image || null;
        await fetchLearners();
      });

      return {
        facilityName,
        // eslint-disable-next-line vue/no-unused-properties
        learners,
        filteredLearners,
        loading,
        searchQuery,
        selectedIds,
        selectedCount,
        learnersMissingTokenCount,
        generating,
        printing,
        printLearners,
        cardBrandImage,
        logoInputRef,
        gridStyle,
        toggleSelect,
        selectAll,
        deselectAll,
        onCardRefresh,
        onCardError,
        printSelected,
        printAll,
        generateQrCodes,
        triggerLogoInput,
        onLogoSelected,
        idCardsPageTitle$,
        idCardsPageDescription$,
        printAllCards$,
        printSelected$,
        selectAll$,
        deselectAll$,
        selectedCount$,
        noLearnersFound$,
        searchLearners$,
        uploadLogo$,
        replaceLogo$,
        // eslint-disable-next-line vue/no-unused-properties
        logoUploaded$,
        generateQrCodes$,
        generatingQrCodes$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .page-description {
    margin: 0 0 16px;
    font-size: 14px;
  }

  .header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
  }

  .logo-btn {
    font-size: 13px;
  }

  .generate-btn {
    font-size: 13px;
  }

  .generate-status {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 8px 0;
    font-size: 13px;
  }

  .hidden-input {
    display: none;
  }

  .select-controls {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 8px;
  }

  .selected-count {
    font-size: 13px;
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

  .print-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    overflow: auto;
    background-color: white;
  }

</style>


<style>

  /*
   * Global (unscoped) print rules.
   * Use the visibility trick to hide ALL page content during print
   * except the print overlay. This prevents bleed from the on-screen
   * cards grid, header, and search bar appearing in the print output.
   */
  @media print {
    body * {
      visibility: hidden;
    }

    .print-overlay,
    .print-overlay * {
      visibility: visible;
    }

    .print-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      background: white;
    }
  }

  @page {
    size: letter;
    margin: 0.5in;
  }

</style>
