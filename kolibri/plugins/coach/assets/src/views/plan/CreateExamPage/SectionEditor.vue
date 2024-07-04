<template>

  <div
    v-if="activeSection"
    class="section-settings-content"
  >
    <h5
      class="section-settings-top-heading"
      :style="{ color: $themeTokens.text }"
    >
      {{ sectionSettings$() }}
    </h5>

    <KTextbox
      ref="sectionTitle"
      v-model="section_title"
      :label="sectionTitle$()"
      :invalid="sectionTitleInvalid"
      :invalidText="sectionTitleInvalidText"
      :maxlength="100"
    />

    <KTextbox
      v-model="description"
      :label="optionalDescriptionLabel$()"
      :maxlength="400"
      :textArea="true"
      class="description-ktextbox-style"
    />

    <hr :style="dividerStyle" >

    <div>
      <h5 class="section-settings-heading">
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
            :buttonValue="false"
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
            :buttonValue="true"
            :description="fixedOptionDescription$()"
          />
        </KGridItem>
      </KGrid>
    </div>

    <hr :style="dividerStyle" >

    <h5 class="section-settings-heading">
      {{
        numberOfQuestionsSelected$({
          count: activeQuestions.length,
        })
      }}
    </h5>

    <KRouterLink
      appearance="raised-button"
      :to="selectResourcesRoute"
      style="margin-bottom: 1em"
      iconAfter="forward"
    >
      {{ resourceButtonLabel }}
    </KRouterLink>

    <hr :style="dividerStyle" >

    <h5 class="section-order-style section-settings-heading">
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
              :style="
                activeSection.section_id === section.section_id ? activeSectionStyles : borderStyle
              "
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
            @click="handleDeleteSection()"
          />
        </KGridItem>
        <KGridItem
          style="text-align: right"
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
      {{
        deleteConfirmation$({
          section_title: displaySectionTitle(activeSection, activeSectionIndex),
        })
      }}
    </KModal>
  </div>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import pick from 'lodash/pick';
  import { getCurrentInstance, computed, ref } from 'kolibri.lib.vueCompositionApi';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
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
        sectionTitleUniqueWarning$,
        numberOfQuestionsLabel$,
        optionalDescriptionLabel$,
        numberOfQuestionsSelected$,
        currentSection$,
        deleteSectionLabel$,
        applySettings$,
        sectionOrder$,
        questionOrder$,
        randomizedLabel$,
        randomizedOptionDescription$,
        fixedLabel$,
        fixedOptionDescription$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        deleteConfirmation$,
        addQuestionsLabel$,
        addMoreQuestionsLabel$,
        sectionDeletedNotification$,
      } = enhancedQuizManagementStrings;

      const {
        activeSectionIndex,
        activeSection,
        activeResourcePool,
        activeQuestions,
        allSections,
        updateSection,
        updateQuiz,
        removeSection,
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
        const section_title = displaySectionTitle(activeSection.value, activeSectionIndex.value);
        const newIndex = this.activeSectionIndex > 0 ? this.activeSectionIndex - 1 : 0;
        removeSection(activeSectionIndex.value);
        router.replace({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: this.$route.params.classId,
            quizId: this.$route.params.quizId,
            sectionIndex: newIndex,
          },
        });
        this.$store.dispatch('createSnackbar', sectionDeletedNotification$({ section_title }));
      }

      function handleDeleteSection() {
        showDeleteConfirmation.value = true;
      }

      /* Note that the use of snake_case here is to map directly to the API */
      const learners_see_fixed_order = ref(activeSection?.value?.learners_see_fixed_order || false);
      const description = ref(activeSection?.value?.description || '');
      const section_title = ref(activeSection?.value?.section_title?.trim() || '');

      const sectionTitleInvalidText = computed(() => {
        if (section_title.value.trim() === '') {
          // Always allow empty section titles
          return '';
        }
        const titleIsUnique = allSections.value.every((section, index) => {
          if (index === activeSectionIndex.value) {
            // Skip the current section
            return true;
          }
          return section.section_title.trim() !== section_title.value.trim();
        });
        if (!titleIsUnique) {
          return sectionTitleUniqueWarning$();
        }
      });

      const activeSectionChanged = computed(() => {
        return !isEqual(
          {
            learners_see_fixed_order: learners_see_fixed_order.value,
            description: description.value,
            section_title: section_title.value.trim(),
          },
          pick(activeSection.value, ['learners_see_fixed_order', 'description', 'section_title']),
        );
      });

      const sectionOrderList = ref(allSections.value);

      const sectionOrderChanged = computed(() => {
        return !isEqual(
          allSections.value.map(section => section.section_id),
          sectionOrderList.value.map(section => section.section_id),
        );
      });

      const formDataHasChanged = computed(() => {
        return activeSectionChanged.value || sectionOrderChanged.value;
      });

      const { windowIsLarge, windowIsSmall } = useKResponsiveWindow();

      const resourceButtonLabel = computed(() => {
        if (activeQuestions.value.length === 0) {
          return addQuestionsLabel$();
        } else {
          return addMoreQuestionsLabel$();
        }
      });

      return {
        sectionTitleInvalidText,
        sectionTitleInvalid: computed(() => Boolean(sectionTitleInvalidText.value)),
        formDataHasChanged,
        sectionOrderChanged,
        showCloseConfirmation,
        showDeleteConfirmation,
        handleCancelClose,
        handleConfirmClose,
        handleCancelDelete,
        handleConfirmDelete,
        // useQuizCreation
        activeSectionIndex,
        activeSection,
        activeResourcePool,
        activeQuestions,
        allSections,
        sectionOrderList,
        updateSection,
        updateQuiz,
        handleDeleteSection,
        // Form models
        learners_see_fixed_order,
        description,
        section_title,
        resourceButtonLabel,
        // Responsiveness
        windowIsLarge,
        windowIsSmall,
        // i18n
        displaySectionTitle,
        addQuestionsLabel$,
        sectionSettings$,
        sectionTitle$,
        numberOfQuestionsLabel$,
        optionalDescriptionLabel$,
        numberOfQuestionsSelected$,
        sectionDeletedNotification$,
        currentSection$,
        deleteSectionLabel$,
        applySettings$,
        closeConfirmationTitle$,
        closeConfirmationMessage$,
        deleteConfirmation$,
        addMoreQuestionsLabel$,
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
        if (this.sectionTitleInvalid) {
          this.$refs.sectionTitle.focus();
          return;
        }
        this.updateSection({
          sectionIndex: this.activeSectionIndex,
          section_title: this.section_title,
          description: this.description,
          learners_see_fixed_order: this.learners_see_fixed_order,
        });
        if (this.sectionOrderChanged) {
          // Apply the new sorting to the updated sections,
          // otherwise the edits we just made will be lost
          const sectionOrderIds = this.sectionOrderList.map(section => section.section_id);
          const question_sources = this.allSections.sort((a, b) => {
            return sectionOrderIds.indexOf(a.section_id) - sectionOrderIds.indexOf(b.section_id);
          });
          this.updateQuiz({
            question_sources,
          });
        }
        this.$emit('closePanel');
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

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

  .section-order-style {
    font-size: 1em;
  }

  .current-section-style {
    font-size: 1em;
  }

  .bottom-buttons-style {
    position: absolute;
    right: 0;
    bottom: 0;
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
