<template>

  <ImmersivePage
    :appBarTitle="allPasswordsHeader$()"
    :route="route"
    :primary="false"
    :showHeader="!$isPrint"
  >
    <KPageContainer :class="{ 'passwords-page-container': !$isPrint && windowBreakpoint > 4 }">
      <!-- Screen-only header with Print button -->
      <KGrid v-show="!$isPrint">
        <KGridItem
          :layout12="{ span: 6, alignment: 'left' }"
          :layout8="{ span: 4, alignment: 'left' }"
          :layout4="{ span: 2, alignment: 'left' }"
          class="header-row"
        >
          <h1 class="header-title">{{ allPasswordsHeader$() }}</h1>
        </KGridItem>
        <KGridItem
          :layout12="{ span: 6, alignment: 'right' }"
          :layout8="{ span: 4, alignment: 'right' }"
          :layout4="{ span: 2, alignment: 'right' }"
          class="header-row print-button"
        >
          <KButton
            :text="printAction$()"
            :disabled="!hasPicturePasswords"
            @click="openPrintDialog"
          />
        </KGridItem>
      </KGrid>

      <!-- Print-only header with facility and class name -->
      <div
        v-if="$isPrint"
        class="print-header"
      >
        <h4 class="print-facility-class">{{ currentFacilityName }} - {{ className }}</h4>
      </div>

      <KTable
        :headers="tableHeaders"
        :rows="tableRows"
        :caption="allPasswordsHeader$()"
        :dataLoading="loading"
        :emptyMessage="noLearnersInClass$()"
        :sortable="!$isPrint"
        :class="{
          'passwords-table-print-images': $isPrint && printFormat === 'images',
          'passwords-table-print': $isPrint,
        }"
        disableBuiltinSorting
        @changeSort="handleSortChange"
      >
        <template #header="{ header }">
          <span
            v-show="!$isPrint"
            :class="{ visuallyhidden: header.columnId === 'picture_password' }"
          >{{ header.label }}</span>
        </template>
        <template #cell="{ content, colIndex }">
          <span
            v-if="colIndex === 0"
            dir="auto"
            :style="{ color: $themeTokens.text }"
          >{{ content.full_name }}</span>

          <span
            v-else-if="colIndex === 1"
            dir="auto"
            :style="{ color: $themeTokens.annotation }"
          >{{ content.username }}</span>

          <div
            v-else
            dir="ltr"
          >
            <template v-if="content.picture_password">
              <!-- Text-only: hyphenated labels e.g. "cat - dog - rat" -->
              <div
                v-if="$isPrint && printFormat === 'text'"
                class="password-text-sequence"
              >
                {{ getPasswordTextLabels(content.picture_password) }}
              </div>
              <!-- Images: icon sequence with labels -->
              <UserPicturePassword
                v-else
                :picturePassword="content.picture_password"
                :showSequenceNumbers="$isPrint"
                :ariaLabel="picturePasswordSequenceForLearner$({ learnerName: content.full_name })"
              />
            </template>
            <div
              v-else
              class="no-password-info"
            >
              <span
                class="no-password-title"
                :style="{ color: $themeTokens.text }"
              >{{ noPicturePasswordDescription$() }}</span>
              <span
                class="no-password-subtitle"
                :style="{ color: $themeTokens.annotation }"
              >{{ noPasswordSignInDescription$() }}</span>
            </div>
          </div>
        </template>
      </KTable>
    </KPageContainer>

    <!-- Print format selection dialog -->
    <KModal
      v-if="showPrintDialog"
      :title="printPasswordsDialogHeader$()"
      :submitText="continueAction$()"
      :cancelText="cancelAction$()"
      @submit="handlePrintSubmit"
      @cancel="closePrintDialog"
    >
      <KRadioButtonGroup>
        <KRadioButton
          v-model="printFormat"
          :label="printWithImages$()"
          buttonValue="images"
        />
        <KRadioButton
          v-model="printFormat"
          :label="printWithTextOnly$()"
          buttonValue="text"
        />
      </KRadioButtonGroup>

      <!-- Live preview for example learner -->
      <section
        v-if="previewLearner"
        class="preview-section"
      >
        <h6 class="preview-label">{{ printFormatPreviewLabel$() }}</h6>
        <div
          class="preview-content"
          :style="previewContentStyle"
        >
          <div class="learner-info">
            <span
              dir="auto"
              class="learner-name"
              :style="{ color: $themeTokens.text }"
            >{{ previewLearner.full_name }}</span>
            <span
              dir="auto"
              class="learner-username"
              :style="{ color: $themeTokens.annotation }"
            >{{ previewLearner.username }}</span>
          </div>
          <div dir="ltr">
            <div
              v-if="printFormat === 'text'"
              class="password-text-sequence"
            >
              {{ getPasswordTextLabels(previewLearner.picture_password) }}
            </div>
            <UserPicturePassword
              v-else
              :picturePassword="previewLearner.picture_password"
              :showSequenceNumbers="true"
              :ariaLabel="
                picturePasswordSequenceForLearner$({ learnerName: previewLearner.full_name })
              "
            />
          </div>
        </div>
      </section>
    </KModal>
  </ImmersivePage>

</template>


<script>

  import { ref, computed, onMounted } from 'vue';
  import orderBy from 'lodash/orderBy';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
  import { getPicturePasswordIcons } from 'kolibri-common/utils/picturePassword';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import UserPicturePassword from 'kolibri-common/components/UserPicturePassword';
  import useFacility from 'kolibri-common/composables/useFacility';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'AllPasswordsPage',
    components: { ImmersivePage, UserPicturePassword },
    setup(props) {
      const learners = ref([]);
      const loading = ref(true);
      const showPrintDialog = ref(false);
      const printFormat = ref('images');
      const className = ref('');

      const { currentFacilityName } = useFacility();
      const { windowBreakpoint } = useKResponsiveWindow();

      const { nameLabel$, usernameLabel$, passwordLabel$, cancelAction$, continueAction$ } =
        coreStrings;
      const {
        noLearnersInClass$,
        noPicturePasswordDescription$,
        noPasswordSignInDescription$,
        printAction$,
        allPasswordsHeader$,
        printWithImages$,
        printWithTextOnly$,
        printPasswordsDialogHeader$,
        printFormatPreviewLabel$,
        picturePasswordSequenceForLearner$,
      } = picturePasswordStrings;

      const previewLearner = computed(() => {
        return learners.value.find(learner => learner.picture_password) || null;
      });

      const hasPicturePasswords = computed(() => {
        return Boolean(previewLearner.value);
      });

      const sortKey = ref(0);
      const sortOrder = ref(null);

      const tableHeaders = computed(() => [
        { label: nameLabel$(), dataType: 'string', columnId: 'full_name', width: '45%' },
        { label: usernameLabel$(), dataType: 'string', columnId: 'username', width: '45%' },
        {
          label: passwordLabel$(),
          dataType: 'undefined',
          columnId: 'picture_password',
          width: '10%',
        },
      ]);

      const sortedLearners = computed(() => {
        const header = tableHeaders.value[sortKey.value];
        const column = header && header.dataType !== 'undefined' ? header.columnId : 'full_name';
        return orderBy(learners.value, [column], [sortOrder.value || 'asc']);
      });

      const tableRows = computed(() =>
        sortedLearners.value.map(learner => [learner, learner, learner]),
      );

      function handleSortChange({ sortKey: key, sortOrder: order }) {
        sortKey.value = key;
        sortOrder.value = order;
      }

      onMounted(() => {
        Promise.all([
          FacilityUserResource.fetchCollection({
            getParams: { member_of: props.classId },
            force: true,
          }),
          ClassroomResource.fetchModel({ id: props.classId }),
        ])
          .then(([users, classroom]) => {
            learners.value = users;
            className.value = classroom.name;
          })
          .finally(() => {
            loading.value = false;
          });
      });

      function getPasswordTextLabels(picturePassword) {
        return getPicturePasswordIcons(picturePassword)
          .map(icon => icon.label)
          .join(' - ');
      }

      function openPrintDialog() {
        showPrintDialog.value = true;
      }

      function closePrintDialog() {
        showPrintDialog.value = false;
      }

      return {
        loading,
        showPrintDialog,
        printFormat,
        className,
        currentFacilityName,
        windowBreakpoint,
        previewLearner,
        hasPicturePasswords,
        tableHeaders,
        tableRows,
        handleSortChange,
        getPasswordTextLabels,
        openPrintDialog,
        closePrintDialog,
        cancelAction$,
        continueAction$,
        noLearnersInClass$,
        noPicturePasswordDescription$,
        noPasswordSignInDescription$,
        printAction$,
        allPasswordsHeader$,
        printWithImages$,
        printWithTextOnly$,
        printPasswordsDialogHeader$,
        printFormatPreviewLabel$,
        picturePasswordSequenceForLearner$,
      };
    },
    props: {
      classId: {
        type: String,
        required: true,
      },
      route: {
        type: Object,
        default: null,
      },
    },
    computed: {
      previewContentStyle() {
        return {
          backgroundColor: this.$themePalette.grey.v_100,
          borderColor: this.$themeTokens.fineLine,
        };
      },
    },
    methods: {
      handlePrintSubmit() {
        this.closePrintDialog();
        this.$nextTick(() => this.$print());
      },
    },
  };

</script>


<style lang="scss" scoped>

  .passwords-page-container {
    margin: 80px 175px 72px;
  }

  .header-row {
    display: flex;
    align-items: center;
    margin-top: 16px;
    margin-bottom: 16px;
  }

  .header-title {
    padding: 8px;
    margin: 0;
  }

  .print-button {
    justify-content: flex-end;
  }

  .learner-info {
    display: flex;
    flex-direction: column;
  }

  .learner-name {
    padding-bottom: 4px;
    font-size: 16px;
  }

  .learner-username {
    font-size: 14px;
  }

  .no-password-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 165px;
    min-height: 64px;
    padding-left: 8px;
  }

  .no-password-title {
    font-size: 14px;
  }

  .no-password-subtitle {
    font-size: 12px;
  }

  .password-text-sequence {
    font-size: 16px;
  }

  .preview-section {
    margin-top: 16px;
  }

  .preview-label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: bold;
  }

  .preview-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border: 2px solid;
    border-radius: 8px;
  }

  .print-header {
    display: none;
    padding: 2px 8px;
  }

  .passwords-table-print /deep/ th,
  .passwords-table-print-images /deep/ td {
    border-bottom-width: 0 !important;
  }

  @media print {
    .passwords-table-print /deep/ td {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-header {
      display: block;
    }

    .print-facility-class {
      margin: 0 0 16px;
      font-size: 20px;
    }
  }

</style>
