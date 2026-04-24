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

      <KTable
        v-if="!$isPrint"
        :headers="tableHeaders"
        :rows="tableRows"
        :caption="allPasswordsHeader$()"
        :dataLoading="loading"
        :emptyMessage="noLearnersInClass$()"
        :defaultSort="{ columnId: 'full_name', direction: 'asc' }"
        sortable
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
        <h6 class="preview-label">{{ printFormatPreviewLabel$() }}</h6>
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

  import { ref, computed, onMounted } from 'vue';
  import orderBy from 'lodash/orderBy';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import UserPicturePassword from 'kolibri-common/components/UserPicturePassword';
  import NoPasswordInfo from 'kolibri-common/components/NoPasswordInfo';
  import LearnerPasswordCard from 'kolibri-common/components/LearnerPasswordCard';
  import useFacility from 'kolibri-common/composables/useFacility';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'AllPasswordsPage',
    metaInfo() {
      return { title: this.pageTitle };
    },
    components: { ImmersivePage, UserPicturePassword, NoPasswordInfo, LearnerPasswordCard },
    setup(props) {
      const learners = ref([]);
      const loading = ref(true);
      const showPrintDialog = ref(false);
      const printFormat = ref('images');
      const className = ref('');

      const { currentFacilityName } = useFacility();
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

      const previewLearner = computed(() => {
        return learners.value.find(learner => learner.picture_password) || null;
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

      const printLearners = computed(() => orderBy(learners.value, ['full_name'], ['asc']));

      const tableRows = computed(() => learners.value.map(l => [l.full_name, l.username, l]));

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
      pageTitle() {
        return [
          this.allPasswordsHeader$(),
          this.className,
          this.currentFacilityName,
          this.kolibriLabel$(),
        ]
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

  .preview-section {
    margin-top: 16px;
  }

  .preview-label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: bold;
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
