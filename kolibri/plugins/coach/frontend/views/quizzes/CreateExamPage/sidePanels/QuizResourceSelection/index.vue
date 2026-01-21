<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    :immersive="isImmersivePage"
    @closePanel="handleClosePanel"
    @shouldFocusFirstEl="() => null"
  >
    <template #header>
      <div style="display: flex; gap: 8px; align-items: center">
        <KIconButton
          v-if="goBack"
          icon="back"
          :tooltip="goBackAction$()"
          :ariaLabel="goBackAction$()"
          @click="goBack()"
        />
        <h1 class="side-panel-title">{{ title }}</h1>
      </div>
    </template>
    <template #default="{ isScrolled }">
      <div
        v-if="showManualSelectionNotice && $route.name !== PageNames.QUIZ_SELECT_RESOURCES_SETTINGS"
        class="alert d-flex-between"
        :class="{
          shadow: isScrolled,
        }"
        :style="{
          padding: '8px 16px',
          background: $themePalette.green.v_100,
        }"
      >
        <div class="choosing-manually-label">
          <KIcon
            icon="correct"
            class="correct-icon"
          />
          <span>
            {{
              settings.isChoosingManually ? manualSelectionOnNotice$() : manualSelectionOffNotice$()
            }}
          </span>
        </div>
        <KButton
          appearance="flat-button"
          :text="dismissAction$()"
          @click="showManualSelectionNotice = false"
        />
      </div>

      <div
        v-if="maximumContentSelectedWarning"
        class="alert warning"
        :class="{
          shadow: isScrolled,
        }"
        :style="{
          background: $themePalette.lightblue.v_100,
        }"
      >
        <span>
          {{ maximumContentSelectedWarning }}
        </span>
      </div>
      <div v-if="subpageLoading">
        <KCircularLoader />
      </div>
      <router-view
        v-else
        v-autofocus-first-el="!isLandingRoute"
        :setTitle="value => (title = value)"
        :setGoBack="value => (goBack = value)"
        :setContinueAction="value => (continueAction = value)"
        :defaultTitle="defaultTitle"
        :sectionTitle="sectionTitle"
        :selectedResources="workingResourcePool"
        :selectedQuestions="workingQuestions"
        :topic="topic"
        :treeFetch="treeFetch"
        :searchTerms.sync="searchTerms"
        :searchFetch="searchFetch"
        :channelsFetch="channelsFetch"
        :bookmarksFetch="bookmarksFetch"
        :selectAllRules="selectAllRules"
        :selectionRules="selectionRules"
        :settings.sync="settings"
        :target="SelectionTarget.QUIZ"
        :contentCardMessage="contentCardMessage"
        :bookmarksCardMessage="bookmarksCardMessage"
        :getResourceLink="getResourceLink"
        :unselectableResourceIds="unselectableResourceIds"
        :unselectableQuestionItems="unselectableQuestionItems"
        :displayingSearchResults="displayingSearchResults"
        @selectResources="addToWorkingResourcePool"
        @selectQuestions="addToWorkingQuestions"
        @deselectResources="removeFromWorkingResourcePool"
        @deselectQuestions="removeFromWorkingQuestions"
        @setSelectedResources="setWorkingResourcePool"
        @removeSearchFilterTag="removeSearchFilterTag"
        @clearSearch="clearSearch"
      />
      <KModal
        v-if="showCloseConfirmation"
        :submitText="coreString('continueAction')"
        :cancelText="coreString('cancelAction')"
        :title="closeConfirmationTitle$()"
        @cancel="handleCancelClose"
        @submit="handleCloseContinue"
      >
        {{ closeConfirmationMessage$() }}
      </KModal>
    </template>

    <template
      v-if="$route.name !== PageNames.QUIZ_SELECT_RESOURCES_SEARCH"
      #bottomNavigation
    >
      <div class="bottom-nav-container">
        <KButton
          v-if="continueAction"
          :disabled="continueAction.disabled"
          :text="continueAction.text || coreString('continueAction')"
          @click="continueAction.handler"
        />
        <template v-else>
          <div v-if="!settings.selectPracticeQuiz">
            <span v-if="tooManyQuestions">
              {{
                tooManyQuestions$({
                  count: settings.questionCount,
                })
              }}
            </span>
            <KRouterLink
              v-else-if="
                numberOfSelectedElementsLabel && $route.name !== previewSelectedElementsPage
              "
              :to="{ name: previewSelectedElementsPage }"
            >
              {{ numberOfSelectedElementsLabel }}
            </KRouterLink>
          </div>
          <div class="save-button-wrapper">
            <KButton
              primary
              :text="saveButtonLabel"
              :disabled="disableSave"
              @click="saveSelectedResource"
            />
          </div>
        </template>
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import get from 'lodash/get';
  import uniqWith from 'lodash/uniqWith';
  import isEqual from 'lodash/isEqual';
  import { useMemoize } from '@vueuse/core';
  import Modalities from 'kolibri-constants/Modalities';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { computed, ref, getCurrentInstance, watch } from 'vue';
  import commonCoreStrings, { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { ContentNodeKinds, MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri/constants';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute.js';
  import { coachStrings } from '../../../../common/commonCoachStrings';
  import { exerciseToQuestionArray } from '../../../../../utils/selectQuestions';
  import { PageNames } from '../../../../../constants/index';
  import useQuizResources from '../../../../../composables/useQuizResources';
  import { injectQuizCreation } from '../../../../../composables/useQuizCreation';
  import useResourceSelection from '../../../../../composables/useResourceSelection';
  import { SelectionTarget } from '../../../../common/resourceSelection/contants';
  import autofocusFirstEl from '../../../../common/directives/autofocusFirstEl';

  export default {
    name: 'QuizResourceSelection',
    components: {
      SidePanelModal,
    },
    directives: {
      autofocusFirstEl,
    },
    mixins: [commonCoreStrings],
    setup() {
      const previousRoute = usePreviousRoute();
      const isLandingRoute = computed(() => previousRoute.value === null);

      const { $store, $router } = getCurrentInstance().proxy;
      const route = computed(() => $store.state.route);
      const {
        activeSection,
        activeSectionIndex,
        updateSection,
        addQuestionsToSection,
        addQuestionsToSectionFromResources,
        allQuestionsInQuiz,
        allResourceMap,
        activeQuestions,
        addSection,
        questionItemsToReplace,
        setQuestionItemsToReplace,
        clearSelectedQuestions: clearQuizSelectedQuestions,
      } = injectQuizCreation();
      const showCloseConfirmation = ref(false);

      const { selectPracticeQuiz } = route.value.query;

      /**
       * @type {Ref<QuizExercise[]>} - The uncommitted version of the section's resource_pool
       */
      const workingResourcePool = ref([]);

      const resetSelection = () => {
        workingResourcePool.value = [];
        workingQuestions.value = [];
      };
      /**
       * @type {Ref<QuizQuestions[]>}
       */
      const workingQuestions = ref([]);

      const showManualSelectionNotice = ref(false);

      /**
       * Selection settings for the current resource selection session
       */
      const settings = ref({
        maxQuestions: null,
        questionCount: null,
        isChoosingManually: null,
        selectPracticeQuiz,
        isInReplaceMode: Boolean(questionItemsToReplace.value?.length),
        questionItemsToReplace: questionItemsToReplace.value,
      });
      watch(
        activeQuestions,
        () => {
          const newSettings = { ...settings.value };
          newSettings.maxQuestions = MAX_QUESTIONS_PER_QUIZ_SECTION - activeQuestions.value.length;
          if (newSettings.questionCount === null) {
            // initialize questionCount if it hasn't been set yet
            newSettings.questionCount = Math.min(10, newSettings.maxQuestions);
          }
          settings.value = newSettings;
        },
        { immediate: true },
      );

      watch(settings, (newSettings, oldSettings) => {
        // If isChoosingManually was toggled
        if (newSettings.isChoosingManually !== oldSettings.isChoosingManually) {
          // If value was set for the first time, dont show the notice
          if (oldSettings.isChoosingManually !== null) {
            showManualSelectionNotice.value = true;
          }

          if (newSettings.isChoosingManually) {
            newSettings.questionCount = newSettings.maxQuestions;
          }

          resetSelection();
        }
      });

      if (settings.value.isInReplaceMode) {
        settings.value = {
          ...settings.value,
          isChoosingManually: true,
          maxQuestions: settings.value.questionItemsToReplace.length,
        };
      }

      const {
        questionsUnusedInSection$,
        tooManyQuestions$,
        selectQuiz$,
        addNumberOfQuestions$,
        replaceNumberOfQuestions$,
        maximumResourcesSelectedWarning$,
        maximumQuestionsSelectedWarning$,
        manualSelectionOnNotice$,
        manualSelectionOffNotice$,
        selectResourcesDescription$,
        selectPracticeQuizLabel$,
        replaceQuestions$,
      } = enhancedQuizManagementStrings;

      const { closeConfirmationTitle$, closeConfirmationMessage$ } = coachStrings;

      /**
       * @param {QuizExercise[]} resources
       * @affects workingResourcePool -- Updates it with the given resources and is ensured to have
       * a list of unique resources to avoid unnecessary duplication
       */
      function addToWorkingResourcePool(resources = []) {
        workingResourcePool.value = uniqWith(
          [
            ...workingResourcePool.value,
            ...resources.filter(r => r.kind === ContentNodeKinds.EXERCISE),
          ],
          isEqual,
        );
      }

      /**
       * @param {QuizExercise} content
       * @affects workingResourcePool - Remove given quiz exercise from workingResourcePool
       */
      function removeFromWorkingResourcePool(resources = []) {
        workingResourcePool.value = workingResourcePool.value.filter(
          obj => !resources.some(r => r.id === obj.id),
        );
      }

      /**
       * @affects workingResourcePool - Resets the workingResourcePool to the previous state
       */
      function setWorkingResourcePool(resources = []) {
        workingResourcePool.value = resources;
      }

      /**
       * @param {QuizQuestions[]} questions
       * @affects workingQuestions -- Updates it with the given questions and is ensured to have
       * a list of unique questions to avoid unnecessary duplication
       */
      function addToWorkingQuestions(questions, resource) {
        workingQuestions.value = uniqWith([...workingQuestions.value, ...questions], isEqual);
        if (!workingResourcePool.value.find(r => r.id === resource.id)) {
          addToWorkingResourcePool([resource]);
        }
      }

      /**
       * @param {QuizQuestions[]} questions
       * @affects workingQuestions -- Removes the given questions from the workingQuestions
       */
      function removeFromWorkingQuestions(questions) {
        workingQuestions.value = workingQuestions.value.filter(
          obj => !questions.some(r => r.item === obj.item),
        );
        const resourcesToRemove = workingResourcePool.value.filter(
          r => !workingQuestions.value.some(q => q.exercise_id === r.id),
        );
        removeFromWorkingResourcePool(resourcesToRemove);
      }

      const { annotateTopicsWithDescendantCounts } = useQuizResources();

      const unusedQuestionsCount = useMemoize(
        content => {
          if (content.kind === ContentNodeKinds.EXERCISE) {
            const questionItems = content.assessmentmetadata.assessment_item_ids.map(
              aid => `${content.id}:${aid}`,
            );
            const questionsItemsUnused = questionItems
              .filter(questionItem => !allQuestionsInQuiz.value.some(q => q.item === questionItem))
              .filter(questionItem => !workingQuestions.value.some(q => q.item === questionItem));
            return questionsItemsUnused.length;
          }
          if (
            content.kind === ContentNodeKinds.TOPIC ||
            content.kind === ContentNodeKinds.CHANNEL
          ) {
            const total = content.num_assessments;
            const numberOfQuestionsSelected = allQuestionsInQuiz.value.reduce((num, question) => {
              const questionNode = allResourceMap.value[question.exercise_id];
              for (const ancestor of questionNode.ancestors) {
                if (ancestor.id === content.id) {
                  return num + 1;
                }
              }
              return num;
            }, 0);
            return total - numberOfQuestionsSelected;
          }
          return -1;
        },
        { getKey: content => content.id },
      );

      /**
       * Practice quizzes should only be included if the resource selection side panel
       * is in `selectPracticeQuiz` mode.
       */
      const isPracticeQuiz = item =>
        !selectPracticeQuiz || get(item, ['options', 'modality'], false) === Modalities.QUIZ;

      /**
       * Because survey questions have no 'correct' answer, and in some cases have a
       * 'correct answer'chosen at random for the sake of having one,
       * we should not allow them to be included in quizzes.
       */
      const isNotSurvey = item => get(item, ['options', 'modality'], false) !== Modalities.SURVEY;

      const {
        topic,
        loading,
        treeFetch,
        channelsFetch,
        bookmarksFetch,
        searchTerms,
        searchFetch,
        displayingSearchResults,
        clearSearch,
        removeSearchFilterTag,
      } = useResourceSelection({
        searchResultsRouteName: PageNames.QUIZ_SELECT_RESOURCES_SEARCH_RESULTS,
        bookmarks: {
          filters: { kind: ContentNodeKinds.EXERCISE },
          annotator: results => results.filter(isNotSurvey).filter(isPracticeQuiz),
        },

        channels: {
          filters: {
            contains_exercise: true,
            contains_quiz: selectPracticeQuiz ? true : null,
          },
          annotator: results =>
            annotateTopicsWithDescendantCounts(
              results.map(channel => {
                return {
                  ...channel,
                  id: channel.root,
                  title: channel.name,
                  kind: ContentNodeKinds.CHANNEL,
                  is_leaf: false,
                };
              }),
            ),
        },
        topicTree: {
          filters: {
            kind_in: [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC],
            contains_quiz: selectPracticeQuiz ? true : null,
          },
          annotator: annotateTopicsWithDescendantCounts,
        },
        search: {
          filters: {
            kind: ContentNodeKinds.EXERCISE,
            contains_quiz: selectPracticeQuiz ? true : null,
            exclude_modalities: Modalities.SURVEY,
          },
        },
      });

      function handleCancelClose() {
        showCloseConfirmation.value = false;
      }

      function handleCloseContinue() {
        setWorkingResourcePool();
        setQuestionItemsToReplace([]);
        $router.push({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: route.value.params.classId,
            quizId: route.value.params.quizId,
            sectionIndex: route.value.params.sectionIndex,
          },
          query: { ...route.value.query },
        });
      }

      function handleClosePanel() {
        if (workingPoolHasChanged.value) {
          showCloseConfirmation.value = true;
        } else {
          handleCloseContinue();
        }
      }

      const workingPoolHasChanged = computed(() => {
        return Boolean(workingResourcePool.value.length);
      });
      const subpageLoading = computed(() => {
        const skipLoading = PageNames.QUIZ_SELECT_RESOURCES_SEARCH;
        return loading.value && route.value.name !== skipLoading;
      });

      const workingPoolQuestionsCount = computed(() => {
        if (settings.value.isChoosingManually) {
          return workingQuestions.value.length;
        }

        return workingResourcePool.value.reduce((acc, content) => {
          return acc + unusedQuestionsCount(content);
        }, 0);
      });

      const tooManyQuestions = computed(() => {
        if (settings.value.isChoosingManually) {
          return workingQuestions.value.length > settings.value.questionCount;
        }

        return workingResourcePool.value.length > settings.value.questionCount;
      });

      const saveButtonLabel = computed(() => {
        if (selectPracticeQuiz) {
          return selectQuiz$();
        }
        if (settings.value.isInReplaceMode) {
          return replaceNumberOfQuestions$({ count: settings.value.questionCount });
        }
        if (settings.value.isChoosingManually) {
          return addNumberOfQuestions$({ count: workingQuestions.value.length });
        }
        return addNumberOfQuestions$({ count: settings.value.questionCount });
      });

      const disableSave = computed(() => {
        if (selectPracticeQuiz) {
          return (
            !workingPoolHasChanged.value && route.value.name !== PageNames.QUIZ_PREVIEW_RESOURCE
          );
        }
        const disabledConditions = [
          !workingPoolHasChanged.value,
          settings.value.questionCount < 1,
          tooManyQuestions.value,
          settings.value.questionCount > settings.value.maxQuestions,
        ];
        if (!settings.value.isChoosingManually || settings.value.isInReplaceMode) {
          disabledConditions.push(workingPoolQuestionsCount.value < settings.value.questionCount);
        }
        return disabledConditions.some(Boolean);
      });

      const title = ref('');
      const goBack = ref(null);
      const continueAction = ref(null);
      const sectionTitle = computed(() =>
        displaySectionTitle(activeSection.value, activeSectionIndex.value),
      );

      const remainingSelectableContent = computed(() => {
        if (settings.value.isChoosingManually) {
          return settings.value.questionCount - workingQuestions.value.length;
        }

        return settings.value.questionCount - workingResourcePool.value.length;
      });

      const selectAllRules = computed(() => [
        contentList => contentList.length <= remainingSelectableContent.value,
      ]);

      const selectionRules = computed(() => [() => remainingSelectableContent.value > 0]);

      const unselectableResourceIds = computed(() => {
        return Object.keys(allResourceMap.value).filter(exerciseId => {
          const exercise = allResourceMap.value[exerciseId];
          const questionItems = exercise.assessmentmetadata.assessment_item_ids.map(
            questionId => `${exerciseId}:${questionId}`,
          );
          return questionItems.every(questionItem =>
            allQuestionsInQuiz.value.some(q => q.item === questionItem),
          );
        });
      });

      const unselectableQuestionItems = computed(() => {
        return allQuestionsInQuiz.value.map(q => q.item);
      });

      const maximumContentSelectedWarning = computed(() => {
        if (
          settings.value.questionCount <= 0 ||
          remainingSelectableContent.value > 0 ||
          settings.value.isInReplaceMode
        ) {
          return null;
        }
        if (settings.value.isChoosingManually) {
          return maximumQuestionsSelectedWarning$();
        }
        return maximumResourcesSelectedWarning$();
      });

      const { numberOfSelectedResources$, numberOfSelectedQuestions$, NOutOfMSelectedQuestions$ } =
        searchAndFilterStrings;

      const numberOfSelectedResourcesLabel = computed(() => {
        if (!workingResourcePool.value.length) {
          return '';
        }
        return numberOfSelectedResources$({
          count: workingResourcePool.value.length,
        });
      });

      const numberOfSelectedQuestionsLabel = computed(() => {
        if (!workingQuestions.value.length) {
          return '';
        }
        if (settings.value.isInReplaceMode) {
          return NOutOfMSelectedQuestions$({
            count: workingQuestions.value.length,
            total: settings.value.questionItemsToReplace.length,
          });
        }
        return numberOfSelectedQuestions$({
          count: workingQuestions.value.length,
        });
      });

      const numberOfSelectedElementsLabel = computed(() => {
        if (settings.value.isChoosingManually) {
          return numberOfSelectedQuestionsLabel.value;
        }
        return numberOfSelectedResourcesLabel.value;
      });

      const { sendPoliteMessage } = useKLiveRegion();
      watch(numberOfSelectedElementsLabel, () => {
        if (numberOfSelectedElementsLabel.value) {
          sendPoliteMessage(numberOfSelectedElementsLabel.value);
        }
      });

      const previewSelectedElementsPage = computed(() => {
        if (settings.value.isChoosingManually) {
          return PageNames.QUIZ_PREVIEW_SELECTED_QUESTIONS;
        }
        return PageNames.QUIZ_PREVIEW_SELECTED_RESOURCES;
      });

      const getDefaultTitle = () => {
        if (selectPracticeQuiz) {
          return selectPracticeQuizLabel$();
        }
        if (settings.value.isInReplaceMode) {
          return replaceQuestions$({ sectionTitle: sectionTitle.value });
        }
        return selectResourcesDescription$({ sectionTitle: sectionTitle.value });
      };
      const defaultTitle = getDefaultTitle();

      const { createSnackbar } = useSnackbar();
      const { numberOfQuestionsAdded$, numberOfQuestionsReplaced$ } = enhancedQuizManagementStrings;
      function notifyChanges(count) {
        const message$ = settings.value.isInReplaceMode
          ? numberOfQuestionsReplaced$
          : numberOfQuestionsAdded$;

        createSnackbar(message$({ count }));
      }

      const bookmarksCardMessage = bookmarks => {
        if (isPracticeQuiz) {
          return;
        }
        const unusedQuestions = bookmarks.reduce((total, bookmark) => {
          const unused = unusedQuestionsCount(bookmark);
          if (unused === -1) {
            return total;
          }
          return total + unused;
        }, 0);
        return questionsUnusedInSection$({ count: unusedQuestions });
      };

      const { goBackAction$, dismissAction$ } = coreStrings;

      return {
        title,
        goBack,
        PageNames,
        continueAction,
        SelectionTarget,
        sectionTitle,
        defaultTitle,
        unusedQuestionsCount,
        activeSectionIndex,
        addSection,
        isLandingRoute,
        workingPoolHasChanged,
        tooManyQuestions,
        notifyChanges,
        handleClosePanel,
        handleCancelClose,
        handleCloseContinue,
        topic,
        showCloseConfirmation,
        treeFetch,
        searchTerms,
        searchFetch,
        channelsFetch,
        bookmarksFetch,
        selectionRules,
        selectAllRules,
        unselectableResourceIds,
        unselectableQuestionItems,
        maximumContentSelectedWarning,
        showManualSelectionNotice,
        subpageLoading,
        displayingSearchResults,
        addToWorkingResourcePool,
        removeFromWorkingResourcePool,
        addToWorkingQuestions,
        removeFromWorkingQuestions,
        setWorkingResourcePool,
        removeSearchFilterTag,
        clearSearch,
        clearQuizSelectedQuestions,
        settings,
        disableSave,
        saveButtonLabel,
        previewSelectedElementsPage,
        numberOfSelectedElementsLabel,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        tooManyQuestions$,
        questionsUnusedInSection$,
        updateSection,
        addQuestionsToSection,
        addQuestionsToSectionFromResources,
        workingResourcePool,
        workingQuestions,
        goBackAction$,
        dismissAction$,
        manualSelectionOnNotice$,
        manualSelectionOffNotice$,
        bookmarksCardMessage,
      };
    },
    computed: {
      isImmersivePage() {
        return (
          this.$route.name === PageNames.QUIZ_SELECT_RESOURCES_TOPIC_TREE &&
          this.$route.query.searchResultTopicId
        );
      },
    },
    beforeRouteLeave(_, __, next) {
      if (!this.showCloseConfirmation && this.workingPoolHasChanged) {
        this.showCloseConfirmation = true;
        next(false);
      } else {
        next();
      }
    },
    methods: {
      async saveSelectedResource() {
        let numQuestions;
        if (this.settings.selectPracticeQuiz) {
          if (this.$route.name === PageNames.QUIZ_PREVIEW_RESOURCE) {
            try {
              const contentNode = await ContentNodeResource.fetchModel({
                id: this.$route.query.contentId,
              });
              this.setWorkingResourcePool([contentNode]);
            } catch (e) {
              this.$store.dispatch('handleApiError', e);
            }
          }
          if (this.workingResourcePool.length !== 1) {
            throw new Error('Only one resource can be selected for a practice quiz');
          }
          const remainder = exerciseToQuestionArray(this.workingResourcePool[0]);

          numQuestions = remainder.length;

          let sectionIndex = this.activeSectionIndex;
          while (remainder.length) {
            if (sectionIndex !== this.activeSectionIndex) {
              this.addSection();
            }
            const questions = remainder.splice(0, MAX_QUESTIONS_PER_QUIZ_SECTION);
            this.updateSection({
              sectionIndex,
              questions,
              resourcePool: this.workingResourcePool,
            });
            sectionIndex++;
          }
        } else if (this.settings.isChoosingManually) {
          numQuestions = this.workingQuestions.length;
          this.addQuestionsToSection({
            sectionIndex: this.activeSectionIndex,
            questions: this.workingQuestions,
            resources: this.workingResourcePool,
            questionItemsToReplace: this.settings.questionItemsToReplace,
          });
        } else {
          numQuestions = this.settings.questionCount;
          this.addQuestionsToSectionFromResources({
            sectionIndex: this.activeSectionIndex,
            resourcePool: this.workingResourcePool,
            questionCount: this.settings.questionCount,
          });
        }

        if (this.settings.isInReplaceMode) {
          // After a successful replacement session the quiz selected questions
          // could be removed, so we need to clear it
          this.clearQuizSelectedQuestions();
        }
        this.notifyChanges(numQuestions);
        this.handleCloseContinue();
      },
      // The message put onto the content's card when listed
      contentCardMessage(content) {
        if (this.settings.selectPracticeQuiz) {
          return;
        }

        const count = this.unusedQuestionsCount(content);

        if (count === -1) {
          // If for some reason we're getting a content type that we don't know how to handle
          // we'll just return nothing to avoid displaying a nonsensical message
          return;
        }

        return this.questionsUnusedInSection$({
          count,
        });
      },
      getResourceLink(resourceId) {
        return {
          name: PageNames.QUIZ_PREVIEW_RESOURCE,
          query: {
            ...this.$route.query,
            contentId: resourceId,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .side-panel-title {
    margin-top: 15px;
    overflow: hidden;
    font-size: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .choosing-manually-label {
    display: flex;
    gap: 16px;
    align-items: center;

    .correct-icon {
      position: unset;
      font-size: 20px;
    }
  }

  .bottom-nav-container {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    width: 100%;

    .save-button-wrapper {
      display: flex;
      align-items: center;
      min-height: 40px;
    }
  }

  .alert {
    top: 0;
    width: 100%;
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 4px;
  }

  .alert.warning {
    position: sticky;
    z-index: 2;
    transition: $core-time ease;

    &.shadow {
      @extend %dropshadow-2dp;
    }
  }

  .d-flex-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

</style>
