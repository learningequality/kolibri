<template>

  <ImmersivePage
    :appBarTitle="!$isPrint ? allPasswordsHeader$() : ''"
    :route="route"
    :primary="false"
  >
    <KPageContainer>
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

      <!-- Print-only header with facility and class name -->
      <div
        v-if="$isPrint"
        class="print-header"
      >
        <h4 class="print-facility-class">{{ currentFacilityName }} - {{ className }}</h4>
      </div>

      <CoreTable
        :dataLoading="loading"
        :emptyMessage="noLearnersInClass$()"
      >
        <template #headers>
          <th
            v-show="!$isPrint"
            class="table-header"
            :style="{ color: $themeTokens.text }"
          >
            {{ nameLabel$() }}
          </th>
        </template>
        <template #tbody>
          <tbody>
            <tr
              v-for="learner in learners"
              :key="learner.id"
            >
              <td :style="tdStyle">
                <div
                  class="learner-row"
                  :style="learnerRowStyle"
                >
                  <div class="learner-info">
                    <span
                      dir="auto"
                      class="learner-name"
                      :style="{ color: $themeTokens.text }"
                    >{{ learner.full_name }}</span>
                    <span
                      dir="auto"
                      class="learner-username"
                      :style="{ color: $themeTokens.annotation }"
                    >{{ learner.username }}</span>
                  </div>
                  <div class="learner-password">
                    <template v-if="learner.picture_password">
                      <!-- Text-only: hyphenated labels e.g. "cat - dog - rat" -->
                      <div
                        v-if="$isPrint && printFormat === 'text'"
                        class="password-text-sequence"
                      >
                        {{ getPasswordTextLabels(learner.picture_password) }}
                      </div>
                      <!-- Images: icon sequence with labels -->
                      <UserPicturePassword
                        v-else
                        :picturePassword="learner.picture_password"
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
                </div>
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
    </KPageContainer>

    <!-- Print format selection dialog -->
    <KModal
      v-if="showPrintDialog"
      :title="printFormatDialogHeader$()"
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
      <div
        v-if="previewLearner"
        class="preview-section"
      >
        <div class="preview-label">{{ printFormatPreviewLabel$() }}</div>
        <div
          class="preview-content"
          :style="previewContentStyle"
        >
          <div class="preview-row">
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
            <div class="learner-password">
              <div
                v-if="printFormat === 'text'"
                class="password-text-sequence"
              >
                {{ getPasswordTextLabels(previewLearner.picture_password) }}
              </div>
              <UserPicturePassword
                v-else
                :picturePassword="previewLearner.picture_password"
              />
            </div>
          </div>
        </div>
      </div>
    </KModal>
  </ImmersivePage>

</template>


<script>

  import { ref, computed, onMounted } from 'vue';
  import CoreTable from 'kolibri/components/CoreTable';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
  import { getPicturePasswordIcons } from 'kolibri-common/utils/picturePassword';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import UserPicturePassword from 'kolibri-common/components/UserPicturePassword';
  import useUser from 'kolibri/composables/useUser';
  import useFacility from 'kolibri-common/composables/useFacility';

  export default {
    name: 'AllPasswordsPage',
    components: { CoreTable, ImmersivePage, UserPicturePassword },
    setup(props) {
      const learners = ref([]);
      const loading = ref(true);
      const showPrintDialog = ref(false);
      const printFormat = ref('images');
      const className = ref('');

      const { isAppContext } = useUser();
      const { currentFacilityName } = useFacility();

      const { nameLabel$, cancelAction$, continueAction$ } = coreStrings;
      const {
        noLearnersInClass$,
        noPicturePasswordDescription$,
        noPasswordSignInDescription$,
        printAction$,
        allPasswordsHeader$,
        printWithImages$,
        printWithTextOnly$,
        printFormatDialogHeader$,
        printFormatPreviewLabel$,
      } = picturePasswordStrings;

      const previewLearner = computed(() => {
        return learners.value.find(learner => learner.picture_password) || null;
      });

      const hasPicturePasswords = computed(() => {
        return Boolean(previewLearner.value);
      });

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
        learners,
        loading,
        showPrintDialog,
        printFormat,
        className,
        isAppContext,
        currentFacilityName,
        previewLearner,
        hasPicturePasswords,
        getPasswordTextLabels,
        openPrintDialog,
        closePrintDialog,
        nameLabel$,
        cancelAction$,
        continueAction$,
        noLearnersInClass$,
        noPicturePasswordDescription$,
        noPasswordSignInDescription$,
        printAction$,
        allPasswordsHeader$,
        printWithImages$,
        printWithTextOnly$,
        printFormatDialogHeader$,
        printFormatPreviewLabel$,
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
      tdStyle() {
        if (this.$isPrint && this.printFormat === 'images') return {};
        if (this.$isPrint) return { borderBottom: `2px solid ${this.$themeTokens.fineLine}` };
        return { borderTop: `2px solid ${this.$themeTokens.fineLine}` };
      },
      learnerRowStyle() {
        if (!(this.$isPrint && this.printFormat === 'images')) return {};
        return {
          backgroundColor: this.$themePalette.grey.v_100,
          border: `3px solid ${this.$themeTokens.fineLine}`,
          borderRadius: '8px',
          padding: '8px',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        };
      },
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
        this.$print();
      },
    },
  };

</script>


<style lang="scss" scoped>

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

  .table-header {
    font-size: 14px;
  }

  .learner-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
  }

  .learner-info {
    display: flex;
    flex-direction: column;
  }

  .learner-name {
    font-size: 16px;
  }

  .learner-username {
    font-size: 14px;
  }

  .learner-password {
    text-align: left;
  }

  .no-password-info {
    display: flex;
    flex-direction: column;
    max-width: 196px;
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
    padding: 12px;
    border: 2px solid;
    border-radius: 8px;
  }

  .preview-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .print-header {
    display: none;
    padding: 2px;
  }

  @media print {
    .print-header {
      display: block;
    }

    .print-facility-class {
      margin: 0 0 16px;
      font-size: 20px;
    }

    table {
      width: 100%;

      thead th:first-child,
      tr td:first-child {
        padding-left: 0;
      }

      thead th:last-child,
      tr td:last-child {
        padding-right: 0;
      }

      tr td {
        padding-top: 4px;
        padding-bottom: 4px;
      }

      tr {
        page-break-inside: avoid;
      }
    }
  }

</style>
