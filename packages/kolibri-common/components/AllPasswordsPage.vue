<template>

  <ImmersivePage
    :appBarTitle="allPasswordsHeader$()"
    :route="route"
    :primary="false"
    :showHeader="!$isPrint"
  >
    <KPageContainer
      :class="{ 'passwords-page-container': !$isPrint && windowBreakpoint > 4 }"
      :topMargin="$isPrint ? 0 : 24"
      :noPadding="$isPrint"
    >
      <!-- Screen-only header with Print button -->
      <KGrid v-show="!$isPrint">
        <KGridItem
          :layout12="{ span: isAppContext ? 12 : 6, alignment: 'left' }"
          :layout8="{ span: isAppContext ? 8 : 4, alignment: 'left' }"
          :layout4="{ span: isAppContext ? 4 : 2, alignment: 'left' }"
          class="header-row"
        >
          <h1 class="header-title">{{ allPasswordsHeader$() }}</h1>
        </KGridItem>
        <KGridItem
          v-if="!isAppContext"
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

      <KTable
        v-if="!$isPrint"
        :headers="tableHeaders"
        :rows="tableRows"
        :caption="allPasswordsHeader$()"
        :emptyMessage="noLearnersInClass$()"
        :defaultSort="{ columnId: 'full_name', direction: 'asc' }"
        sortable
        disableBuiltinSorting
        @changeSort="handleSortChange"
      >
        <template #header="{ header }">
          <span>
            {{ header.label }}
          </span>
        </template>
        <template #cell="{ content, colIndex }">
          <span
            v-if="colIndex === 2"
            dir="ltr"
          >
            <!-- Offsets icon's internal left padding to align with cell edge -->
            <UserPicturePassword
              v-if="content.picture_password"
              :picturePassword="content.picture_password"
              :learnerName="content.full_name"
              :style="{ marginLeft: '-6px' }"
            />
            <NoPasswordInfo v-else />
          </span>
          <span v-else>{{ content }}</span>
        </template>
      </KTable>

      <!-- Print-only list: one card per learner, stacked vertically -->
      <section
        v-else
        class="print-list"
      >
        <!-- Print-only header with facility and class name -->
        <div class="print-header">
          <h4 class="print-facility-class">{{ pageTitle }}</h4>
        </div>

        <LearnerPasswordCard
          v-for="learner in printLearners"
          :key="learner.id"
          :learner="learner"
          :cardStyle="printListCardStyle"
          :printFormat="printFormat"
          :showSequenceNumbers="true"
          :learnerName="learner.full_name"
        />
      </section>
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
        <p
          class="preview-label"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ printFormatPreviewLabel$() }}
        </p>
        <LearnerPasswordCard
          :learner="previewLearner"
          :cardStyle="cardStyle"
          :printFormat="printFormat"
          :showSequenceNumbers="true"
          :learnerName="previewLearner.full_name"
        />
      </section>
    </KModal>
  </ImmersivePage>

</template>


<script>

  import { ref, computed } from 'vue';
  import orderBy from 'lodash/orderBy';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import UserPicturePassword from 'kolibri-common/components/UserPicturePassword';
  import NoPasswordInfo from 'kolibri-common/components/NoPasswordInfo';
  import LearnerPasswordCard from 'kolibri-common/components/LearnerPasswordCard';
  import useUser from 'kolibri/composables/useUser';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'AllPasswordsPage',
    metaInfo() {
      return { title: this.pageTitle };
    },
    components: { ImmersivePage, UserPicturePassword, NoPasswordInfo, LearnerPasswordCard },
    setup(props) {
      const showPrintDialog = ref(false);
      const printFormat = ref('images');

      const { isAppContext } = useUser();
      const { windowBreakpoint } = useKResponsiveWindow();

      const {
        nameLabel$,
        usernameLabel$,
        passwordLabel$,
        cancelAction$,
        continueAction$,
        kolibriLabel$,
      } = coreStrings;
      const {
        noLearnersInClass$,
        printAction$,
        allPasswordsHeader$,
        printWithImages$,
        printWithTextOnly$,
        printPasswordsDialogHeader$,
        printFormatPreviewLabel$,
      } = picturePasswordStrings;

      // Normalize learners so full_name is always populated regardless of
      // whether the source uses full_name (Facility) or name (Coach classSummary)
      const normalizedLearners = computed(() =>
        props.learners.map(l => ({ ...l, full_name: l.full_name ?? l.name })),
      );

      const previewLearner = computed(() => {
        return normalizedLearners.value.find(learner => learner.picture_password) || null;
      });

      const hasPicturePasswords = computed(() => {
        return Boolean(previewLearner.value);
      });

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

      const sortConfig = ref({ columnId: 'full_name', direction: 'asc' });

      const sortedLearners = computed(() =>
        orderBy(
          normalizedLearners.value,
          [sortConfig.value.columnId],
          [sortConfig.value.direction],
        ),
      );

      const printLearners = computed(() => sortedLearners.value);

      const tableRows = computed(() => sortedLearners.value.map(l => [l.full_name, l.username, l]));

      function handleSortChange({ sortKey, sortOrder }) {
        const columnId = tableHeaders.value[sortKey]?.columnId;
        if (!sortOrder || !columnId || columnId === 'picture_password') {
          sortConfig.value = { columnId: 'full_name', direction: 'asc' };
        } else {
          sortConfig.value = { columnId, direction: sortOrder };
        }
      }

      function openPrintDialog() {
        showPrintDialog.value = true;
      }

      function closePrintDialog() {
        showPrintDialog.value = false;
      }

      return {
        isAppContext,
        handleSortChange,
        showPrintDialog,
        printFormat,
        windowBreakpoint,
        previewLearner,
        hasPicturePasswords,
        tableHeaders,
        tableRows,
        printLearners,
        openPrintDialog,
        closePrintDialog,
        cancelAction$,
        continueAction$,
        noLearnersInClass$,
        printAction$,
        allPasswordsHeader$,
        printWithImages$,
        printWithTextOnly$,
        printPasswordsDialogHeader$,
        printFormatPreviewLabel$,
        kolibriLabel$,
      };
    },
    props: {
      learners: {
        type: Array,
        required: true,
      },
      className: {
        type: String,
        required: true,
      },
      facilityName: {
        type: String,
        required: true,
      },
      route: {
        type: Object,
        default: null,
      },
    },
    computed: {
      pageTitle() {
        return [this.allPasswordsHeader$(), this.className, this.facilityName, this.kolibriLabel$()]
          .filter(Boolean)
          .join(' - ');
      },
      cardStyle() {
        return {
          backgroundColor: this.$themePalette.grey.v_100,
          borderColor: this.$themeTokens.fineLine,
        };
      },
      printListCardStyle() {
        if (this.printFormat === 'text') {
          return {
            ...this.cardStyle,
            border: 'none',
            borderBottom: `2px solid ${this.$themeTokens.fineLine}`,
            borderRadius: 0,
            paddingTop: '0px',
            paddingBottom: '16px',
          };
        }
        return this.cardStyle;
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
    max-width: 1000px;
    margin: 80px auto 72px;
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

  .preview-section {
    margin-top: 16px;
  }

  .preview-label {
    margin-top: 32px;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .print-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .print-list /deep/ .password-text-sequence {
    width: 165px;
    padding-left: 8px;
  }

  .print-header {
    display: none;
    padding: 2px 8px;
  }

  @media print {
    .print-header {
      display: block;
    }

    .print-facility-class {
      margin: 0 0 16px;
      font-size: 20px;
    }
  }

</style>
