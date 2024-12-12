<template>

  <div
    v-if="activeSection"
    class="section-settings-content"
  >
    <h1 :style="{ color: $themeTokens.text }">
      {{ sectionSettings$() }}
    </h1>

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
        <KRadioButtonGroup>
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
        </KRadioButtonGroup>
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
      v-if="showResourceButton"
      appearance="raised-button"
      :to="selectResourcesRoute"
      style="margin-bottom: 1em"
      iconAfter="forward"
    >
      {{ resourceButtonLabel }}
    </KRouterLink>
    <p v-else>
      {{ maxQuestionsLabel }}
    </p>
    <div class="bottom-navigation">
      <KButton
        :text="deleteSectionLabel$()"
        @click="handleDeleteSection()"
      />
      <KButton
        :primary="true"
        :text="applySettings$()"
        @click="applySettings()"
      />
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
  import { getCurrentInstance, computed, ref } from 'vue';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri/constants';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { PageNames } from '../../../constants/index';
  import { injectQuizCreation } from '../../../composables/useQuizCreation.js';

  export default {
    name: 'SectionEditor',
    mixins: [commonCoreStrings],
    setup(_, context) {
      const router = getCurrentInstance().proxy.$router;
      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const { createSnackbar } = useSnackbar();

      const {
        sectionSettings$,
        sectionTitle$,
        sectionTitleUniqueWarning$,
        optionalDescriptionLabel$,
        numberOfQuestionsSelected$,
        deleteSectionLabel$,
        applySettings$,
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
        maxNumberOfQuestions$,
      } = enhancedQuizManagementStrings;

      const {
        activeSectionIndex,
        activeSection,
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
        const newIndex = activeSectionIndex.value > 0 ? activeSectionIndex.value - 1 : 0;
        removeSection(activeSectionIndex.value);
        router.replace({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: route.value.params.classId,
            quizId: route.value.params.quizId,
            sectionIndex: newIndex,
          },
        });
        createSnackbar(sectionDeletedNotification$({ section_title }));
      }

      function handleDeleteSection() {
        showDeleteConfirmation.value = true;
      }

      /* Note that the use of snake_case here is to map directly to the API */
      const learners_see_fixed_order = ref(activeSection?.value?.learners_see_fixed_order || false);
      const description = ref(activeSection?.value?.description || '');
      const section_title = ref(activeSection?.value?.section_title?.trim() || '');

      // This is used to track the section that was moved
      const reorderedSectionIndex = ref(null);

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
        return '';
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

      const resourceButtonLabel = computed(() => {
        if (activeQuestions.value.length === 0) {
          return addQuestionsLabel$();
        } else {
          return addMoreQuestionsLabel$();
        }
      });

      const showResourceButton = computed(() => {
        return activeQuestions.value.length < MAX_QUESTIONS_PER_QUIZ_SECTION;
      });

      const maxQuestionsLabel = computed(() => {
        return maxNumberOfQuestions$({ count: MAX_QUESTIONS_PER_QUIZ_SECTION });
      });

      return {
        reorderedSectionIndex,
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
        showResourceButton,
        maxQuestionsLabel,
        // i18n
        displaySectionTitle,
        sectionSettings$,
        sectionTitle$,
        optionalDescriptionLabel$,
        numberOfQuestionsSelected$,
        deleteSectionLabel$,
        applySettings$,
        closeConfirmationTitle$,
        closeConfirmationMessage$,
        deleteConfirmation$,
        questionOrder$,
        randomizedLabel$,
        randomizedOptionDescription$,
        fixedLabel$,
        fixedOptionDescription$,
      };
    },
    computed: {
      dividerStyle() {
        return `color : ${this.$themeTokens.fineLine}`;
      },
      selectResourcesRoute() {
        return { name: PageNames.QUIZ_SELECT_RESOURCES };
      },
    },
    beforeRouteLeave(to, __, next) {
      if (this.formDataHasChanged && !this.showDeleteConfirmation) {
        if (this.showCloseConfirmation) {
          // The user should be confirming losing changes
          next(false);
        } else {
          if (to.name === this.selectResourcesRoute.name) {
            // The user clicked "Add Questions" and we need to save the changes
            // and redirect them
            this.applySettings(to.name);
            return next(false);
          }
          // The user needs to confirm they want to leave
          return (this.showCloseConfirmation = true);
        }
      }
      next();
    },
    methods: {
      applySettings(nextRouteName = PageNames.EXAM_CREATION_ROOT) {
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

        if (nextRouteName) {
          const sectionIndex =
            this.reorderedSectionIndex !== null &&
            this.reorderedSectionIndex !== this.activeSectionIndex
              ? this.reorderedSectionIndex
              : this.activeSectionIndex;

          this.$router.push({
            name: nextRouteName,
            params: {
              sectionIndex,
              classId: this.$route.params.classId,
              quizId: this.$route.params.quizId,
            },
          });
        } else {
          this.$emit('closePanel');
        }
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
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
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

  .drag-title {
    display: inline-block;
    padding: 8px;
  }

  .bottom-navigation {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    padding: 1em;
    margin-top: 1em;
    background-color: #ffffff;
    border-top: 1px solid black;
  }

  /deep/ .textbox {
    max-width: 100% !important;
  }

  .description-ktextbox-style /deep/ .ui-textbox-label {
    width: 100%;
  }

</style>
