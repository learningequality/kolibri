<template>

  <div class="section-settings-content">
    <h5
      class="section-settings-top-heading"
      :style="{ color: $themeTokens.text }"
    >
      {{ sectionSettings$() }}
    </h5>

    <KGrid>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 2 }"
      >
        <KTextbox
          v-model="section_title"
          :label="sectionTitle$()"
          :maxlength="100"
        />
      </KGridItem>
      <KGridItem
        :layout12="{ span: 6 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 2 }"
      >
        <div class="number-question">
          <div>
            <KTextbox
              ref="numQuest"
              v-model="question_count"
              type="number"
              :label="numberOfQuestionsLabel$()"
            />
          </div>
          <div>
            <div
              :style="borderStyle"
              class="group-button-border"
            >
              <KIconButton
                icon="minus"
                aria-hidden="true"
                class="number-btn"
                :disabled="question_count === 1"
                @click="question_count -= 1"
              />
              <span
                :style="dividerStyle"
              > | </span>
              <KIconButton
                icon="plus"
                aria-hidden="true"
                class="number-btn"
                @click="question_count += 1"
              />
            </div>
          </div>
        </div>
      </KGridItem>
    </KGrid>

    <KTextbox
      v-model="description"
      :label="optionalDescriptionLabel$()"
      :maxlength="400"
      :textArea="true"
      class="description-ktextbox-style"
    />

    <hr :style="dividerStyle">

    <div>
      <h5
        class="section-settings-heading"
      >
        {{ questionOrder$() }}
      </h5>
      <KGrid>
        <KGridItem
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <KRadioButton
            v-model="learners_see_fixed_order"
            :label="randomizedLabel$()"
            :buttonValue="true"
            :description="randomizedOptionDescription$()"
          />
        </KGridItem>
        <KGridItem
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <KRadioButton
            v-model="learners_see_fixed_order"
            :label="fixedLabel$()"
            :buttonValue="false"
            :description="fixedOptionDescription$()"
          />
        </KGridItem>
      </KGrid>
    </div>

    <hr :style="dividerStyle">

    <h5
      class="section-settings-heading"
    >
      {{ quizResourceSelection$() }}
    </h5>
    <p>
      {{
        numberOfSelectedResources$(
          {
            count: activeResourcePool.length,
            channels: channels.length
          }
        )
      }}
    </p>

    <KRouterLink
      appearance="raised-button"
      :to="selectResourcesRoute"
      style="margin-bottom: 1em;"
      iconAfter="forward"
    >
      {{ resourceButtonLabel }}
    </KRouterLink>

    <hr :style="dividerStyle">

    <h5
      class="section-order-style section-settings-heading"
    >
      {{ sectionOrder$() }}
    </h5>


    <DragContainer
      v-if="sectionOrderList.length > 0"
      :items="sectionOrderList"
      @sort="handleSectionSort"
    >
      <transition-group>
        <Draggable
          v-for="(section, index) in sectionOrderList"
          :key="section.section_id"
          :style="draggableStyle"
        >
          <DragHandle>
            <div
              :style="section.isActive ? activeSectionStyles : borderStyle "
              class="section-order-list"
            >
              <KGrid>
                <KGridItem
                  :layout12="{ span: 1 }"
                  :layout8="{ span: 1 }"
                  :layout4="{ span: 1 }"
                >
                  <KIcon
                    icon="dragVertical"
                    class="space-content"
                  />
                </KGridItem>

                <KGridItem
                  :layout12="{ span: 6 }"
                  :layout8="{ span: 4 }"
                  :layout4="{ span: 2 }"
                >
                  <p class="space-content">
                    {{ displaySectionTitle(section, index).toUpperCase() }}
                  </p>
                </KGridItem>

                <!-- Perhaps this should be positioned absolutely to
                     accommodate longer section titles -->
                <KGridItem
                  :layout12="{ span: 5 }"
                  :layout8="{ span: 3 }"
                  :layout4="{ span: 1 }"
                  class="current-section-style"
                  :style="{ color: $themePalette.grey.v_700 }"
                >
                  <p
                    v-if="activeSection.section_id === section.section_id"
                    class="current-section-text space-content"
                  >
                    {{ currentSection$() }}
                  </p>
                </KGridItem>
              </KGrid>
            </div>
          </DragHandle>
        </Draggable>
      </transition-group>
    </DragContainer>

    <div class="bottom-buttons-style">
      <KGrid>
        <KGridItem
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <KButton
            :text="deleteSectionLabel$()"
            @click="handleDeleteSection(activeSection.section_id)"
          />

        </KGridItem>
        <KGridItem
          style="text-align: right;"
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <KButton
            :primary="true"
            :text="applySettings$()"
            @click="applySettings"
          />

        </KGridItem>
      </KGrid>
    </div>
    <KModal
      v-if="showCloseConfirmation"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      :title="closeConfirmationTitle$()"
      @cancel="handleCancelClose"
      @submit="handleConfirmClose"
    >
      {{ closeConfirmationMessage$() }}
    </KModal>
    <KModal
      v-if="showDeleteConfirmation"
      :title="deleteSectionLabel$()"
      :submitText="coreString('deleteAction')"
      :cancelText="coreString('cancelAction')"
      @cancel="handleCancelDelete"
      @submit="handleConfirmDelete"
    >
      {{ deleteConfirmation$({ section_title: activeSection.section_title }) }}
    </KModal>
  </div>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import pick from 'lodash/pick';
  import { getCurrentInstance, computed, ref } from 'kolibri.lib.vueCompositionApi';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import { PageNames } from '../../../constants/index';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';

  export default {
    name: 'SectionEditor',
    components: {
      Draggable,
      DragContainer,
      DragHandle,
    },
    mixins: [commonCoreStrings],
    setup(_, context) {
      const router = getCurrentInstance().proxy.$router;

      const {
        sectionSettings$,
        sectionTitle$,
        numberOfQuestionsLabel$,
        optionalDescriptionLabel$,
        quizResourceSelection$,
        numberOfSelectedResources$,
        currentSection$,
        deleteSectionLabel$,
        applySettings$,
        changeResources$,
        sectionOrder$,
        questionOrder$,
        randomizedLabel$,
        randomizedOptionDescription$,
        fixedLabel$,
        fixedOptionDescription$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        deleteConfirmation$,
        changesSavedSuccessfully$,
        selectResourcesFromChannels$,
        sectionDeletedNotification$,
      } = enhancedQuizManagementStrings;

      const {
        activeSection,
        activeResourcePool,
        allSections,
        updateSection,
        updateQuiz,
        removeSection,
        channels,
        displaySectionTitle,
      } = injectQuizCreation();

      const showCloseConfirmation = ref(false);

      function handleCancelClose() {
        showCloseConfirmation.value = false;
      }

      function handleConfirmClose() {
        context.emit('closePanel');
      }

      const showDeleteConfirmation = ref(false);

      function handleCancelDelete() {
        showDeleteConfirmation.value = false;
      }

      function handleConfirmDelete() {
        const section_title = activeSection.value.section_title;
        removeSection(showDeleteConfirmation.value);
        router.replace({
          name: PageNames.EXAM_CREATION_ROOT,
        });
        this.$store.dispatch('createSnackbar', sectionDeletedNotification$({ section_title }));
      }

      function handleDeleteSection(section_id) {
        showDeleteConfirmation.value = section_id;
      }

      /* Note that the use of snake_case here is to map directly to the API */
      const learners_see_fixed_order = ref(activeSection.value.learners_see_fixed_order);
      const question_count = ref(activeSection.value.question_count);
      const description = ref(activeSection.value.description);
      const section_title = ref(activeSection.value.section_title);

      const activeSectionChanged = computed(() => {
        return !isEqual(
          {
            learners_see_fixed_order: learners_see_fixed_order.value,
            question_count: question_count.value,
            description: description.value,
            section_title: section_title.value,
          },
          pick(activeSection.value, [
            'learners_see_fixed_order',
            'question_count',
            'description',
            'section_title',
          ])
        );
      });

      const sectionOrderList = ref(allSections.value);

      const sectionOrderChanged = computed(() => {
        return !isEqual(
          allSections.value.map(section => section.section_id),
          sectionOrderList.value.map(section => section.section_id)
        );
      });

      const formDataHasChanged = computed(() => {
        return activeSectionChanged.value || sectionOrderChanged.value;
      });

      const { windowIsLarge, windowIsSmall } = useKResponsiveWindow();

      const resourceButtonLabel = computed(() => {
        if (activeResourcePool.value.length === 0) {
          return selectResourcesFromChannels$();
        } else {
          return changeResources$();
        }
      });

      return {
        formDataHasChanged,
        sectionOrderChanged,
        showCloseConfirmation,
        showDeleteConfirmation,
        handleCancelClose,
        handleConfirmClose,
        handleCancelDelete,
        handleConfirmDelete,
        // useQuizCreation
        channels,
        activeSection,
        activeResourcePool,
        sectionOrderList,
        updateSection,
        updateQuiz,
        handleDeleteSection,
        // Form models
        learners_see_fixed_order,
        question_count,
        description,
        section_title,
        resourceButtonLabel,
        // Responsiveness
        windowIsLarge,
        windowIsSmall,
        // i18n
        displaySectionTitle,
        selectResourcesFromChannels$,
        sectionSettings$,
        sectionTitle$,
        numberOfQuestionsLabel$,
        optionalDescriptionLabel$,
        quizResourceSelection$,
        numberOfSelectedResources$,
        sectionDeletedNotification$,
        currentSection$,
        deleteSectionLabel$,
        applySettings$,
        changesSavedSuccessfully$,
        closeConfirmationTitle$,
        closeConfirmationMessage$,
        deleteConfirmation$,
        changeResources$,
        sectionOrder$,
        questionOrder$,
        randomizedLabel$,
        randomizedOptionDescription$,
        fixedLabel$,
        fixedOptionDescription$,
      };
    },
    computed: {
      borderStyle() {
        return `border: 1px solid ${this.$themeTokens.fineLine}`;
      },
      activeSectionStyles() {
        return {
          backgroundColor: this.$themePalette.grey.v_50,
          border: `1px solid ${this.$themeTokens.fineLine}`,
        };
      },
      dividerStyle() {
        return `color : ${this.$themeTokens.fineLine}`;
      },
      draggableStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
        };
      },
      selectResourcesRoute() {
        return { name: PageNames.QUIZ_SELECT_RESOURCES };
      },
    },
    beforeRouteLeave(to, __, next) {
      if (!this.showCloseConfirmation && this.formDataHasChanged && !this.showDeleteConfirmation) {
        if (to.name === PageNames.QUIZ_SELECT_RESOURCES) {
          // We're going from here to select resources so we'll save settings and move on without
          // asking for confirmation.
          // TODO This needs to be updated when/if "autosave" is implemented
          this.applySettings();
          next();
        } else {
          this.showCloseConfirmation = true;
          next(false);
        }
      } else {
        next();
      }
    },
    methods: {
      handleSectionSort(e) {
        this.sectionOrderList = e.newArray;
      },
      applySettings() {
        this.updateSection({
          section_id: this.activeSection.section_id,
          section_title: this.section_title,
          description: this.description,
          question_count: this.question_count,
          learners_see_fixed_order: this.learners_see_fixed_order,
        });
        if (this.sectionOrderChanged) {
          this.updateQuiz({
            question_sources: this.sectionOrderList,
          });
        }
        this.$store.dispatch('createSnackbar', this.changesSavedSuccessfully$());
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .number-field {
    display: inline-block;
    max-width: 31em;
    margin-right: 0.5em;
  }

  .section-settings-content {
    margin-bottom: 7em;
  }

  .section-settings-heading {
    margin-bottom: 0.5em;
    font-size: 1em;
    font-weight: 600;
  }

  .section-settings-top-heading {
    margin-top: 0;
    margin-bottom: 0.5em;
    font-size: 18px;
    font-weight: 600;
  }

  .section-order-list {
    height: 2.5em;
    margin-top: 0.5em;
    border: 1px solid;
    border-radius: 2px;
  }

  .space-content {
    margin: 0.5em;
    font-size: 1em;
  }

  .number-input-grid-item {
    display: inline-flex;
  }

  .group-button-border {
    display: inline-flex;
    align-items: center;
    height: 3.5em;
    border: 1px solid;
  }

  .number-question {
    display: inline-flex;
    float: right;
  }

  .section-order-style {
    font-size: 1em;
  }

  .current-section-style {
    font-size: 1em;
  }

  .bottom-buttons-style {
    position: absolute;
    right: 0;
    bottom: 1.5em;
    left: 0;
    padding: 1em;
    margin-top: 1em;
    background-color: #ffffff;
    border-top: 1px solid black;

    > div {
      padding-right: 1em;
    }
  }

  /deep/ .textbox {
    max-width: 100% !important;
  }

  .description-ktextbox-style /deep/ .ui-textbox-label {
    width: 100%;
  }

  .current-section-text {
    text-align: right;
  }

</style>
