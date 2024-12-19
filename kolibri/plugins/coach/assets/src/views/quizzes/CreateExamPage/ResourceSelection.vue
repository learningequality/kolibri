<template>

  <div class="select-resource">
    <div v-if="loading && !loadingMore">
      <KCircularLoader />
    </div>
    <div v-else-if="!showSearch">
      <h1
        v-if="selectPracticeQuiz"
        class="select-folder-style"
      >
        {{ selectPracticeQuizLabel$() }}
      </h1>
      <div v-else>
        <h1 class="select-folder-style">
          {{
            selectResourcesDescription$({
              sectionTitle: displaySectionTitle(activeSection, activeSectionIndex),
            })
          }}
        </h1>
        <p>
          {{ numberOfQuestionsSelected$({ count: activeQuestions.length }) }}
          <span
            class="divider"
            :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
          >
          </span>
        </p>
        <p>{{ numberOfQuestionsToAdd$() }}</p>
        <div class="number-question">
          <div>
            <KTextbox
              ref="numQuest"
              v-model.number="questionCount"
              type="number"
              :label="numberOfQuestionsLabel$()"
              :max="maxQuestions"
              :min="1"
              :invalid="questionCount > maxQuestions"
              :invalidText="maxNumberOfQuestions$({ count: maxQuestions })"
              :showInvalidText="true"
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
                :disabled="questionCount === 1"
                @click="questionCount -= 1"
              />
              <span :style="dividerStyle"> | </span>
              <KIconButton
                icon="plus"
                aria-hidden="true"
                class="number-btn"
                :disabled="questionCount >= maxQuestions"
                @click="questionCount += 1"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isTopicIdSet && bookmarks.length && !showBookmarks && !showSearch">
        <p>{{ coreString('selectFromBookmarks') }}</p>

        <div>
          <KRouterLink
            :appearanceOverrides="{
              width: '100%',
              textDecoration: 'none',
              color: $themeTokens.text,
            }"
            :to="getBookmarksLink"
          >
            <div :class="windowIsSmall ? 'mobile-bookmark-container' : 'bookmark-container'">
              <BookmarkIcon :class="windowIsSmall ? 'mobile-bookmark-icon' : ''" />
              <div :class="windowIsSmall ? 'mobile-text' : 'text'">
                <h3>{{ coreString('bookmarksLabel') }}</h3>
                <p>{{ numberOfSelectedBookmarks$({ count: bookmarks.length }) }}</p>
              </div>
            </div>
          </KRouterLink>
        </div>
      </div>

      <ResourceSelectionBreadcrumbs
        v-if="isTopicIdSet"
        :ancestors="[...topic.ancestors, topic]"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      />

      <div
        v-if="showNumberOfQuestionsWarning"
        class="shadow"
        :style="{
          padding: '1em',
          marginTop: '2em',
          marginBottom: '2em',
          backgroundColor: $themePalette.grey.v_200,
          position: 'sticky',
          insetBlockStart: '0',
          zIndex: '4',
        }"
      >
        {{
          cannotSelectSomeTopicWarning$({
            count: Math.max(maxSectionQuestionOptions, workingPoolUnusedQuestions),
          })
        }}
      </div>

      <ContentCardList
        v-if="!showSearch"
        :contentList="contentList"
        :showSelectAll="showSelectAll"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="selectAllChecked"
        :selectAllIndeterminate="selectAllIndeterminate"
        :contentIsChecked="contentPresentInWorkingResourcePool"
        :contentIsIndeterminate="contentPartlyPresentInWorkingResourcePool"
        :contentHasCheckbox="showCheckbox"
        :contentCheckboxDisabled="
          c =>
            !nodeIsSelectableOrUnselectable(c) && !(c.is_leaf && workingPoolUnusedQuestions === 0)
        "
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
        :showRadioButtons="selectPracticeQuiz"
        @changeselectall="handleSelectAll"
        @change_content_card="toggleSelected"
        @moreresults="fetchMoreResources"
      />

      <div class="bottom-navigation">
        <div>
          <span v-if="!selectPracticeQuiz">
            <span v-if="tooManyQuestions">
              {{
                tooManyQuestions$({
                  count: maxSectionQuestionOptions,
                })
              }}
            </span>
            <span v-else>
              {{
                questionsFromResources$({
                  questions: workingPoolUnusedQuestions,
                })
              }}
            </span>
          </span>
        </div>
        <KButton
          :text="
            selectPracticeQuiz
              ? selectQuiz$()
              : addNumberOfQuestions$({ count: Math.max(1, questionCount) })
          "
          :primary="true"
          :disabled="disableSave"
          @click="saveSelectedResource"
        />
      </div>
    </div>

    <SearchFiltersPanel
      v-if="showSearch"
      ref="sidePanel"
      v-model="searchTerms"
      data-test="side-panel"
      width="100%"
      :accordion="true"
      :showActivities="false"
      @close="showSearch = false"
    />

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
  </div>

</template>


<script>

  import get from 'lodash/get';
  import uniqWith from 'lodash/uniqWith';
  import isEqual from 'lodash/isEqual';
  import { useMemoize } from '@vueuse/core';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { computed, ref, getCurrentInstance, watch } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
  import { ContentNodeKinds, MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri/constants';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useBaseSearch from 'kolibri-common/composables/useBaseSearch';
  import SearchFiltersPanel from 'kolibri-common/components/SearchFiltersPanel';
  import { exerciseToQuestionArray } from '../../../utils/selectQuestions';
  import { PageNames, ViewMoreButtonStates } from '../../../constants/index';
  import BookmarkIcon from '../../lessons/LessonResourceSelectionPage/LessonContentCard/BookmarkIcon.vue';
  import useQuizResources from '../../../composables/useQuizResources';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import ContentCardList from '../../lessons/LessonResourceSelectionPage/ContentCardList.vue';
  import ResourceSelectionBreadcrumbs from '../../lessons/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      SearchFiltersPanel,
      ContentCardList,
      BookmarkIcon,
      ResourceSelectionBreadcrumbs,
    },
    mixins: [commonCoreStrings],
    setup(props, context) {
      const store = getCurrentInstance().proxy.$store;
      const route = computed(() => store.state.route);
      const topicId = computed(() => route.value.params.topic_id);
      // We use this query parameter to decide if we want to show the Bookmarks Card
      // or the actual exercises that are bookmarked and can be selected
      // to be added to Quiz Section.
      const showBookmarks = computed(() => route.value.query.showBookmarks);
      const searchQuery = computed(() => route.value.query.search);
      const {
        activeSection,
        activeSectionIndex,
        allResourceMap,
        updateSection,
        addQuestionsToSectionFromResources,
        allQuestionsInQuiz,
        activeQuestions,
        addSection,
      } = injectQuizCreation();
      const showCloseConfirmation = ref(false);
      const maxQuestions = computed(
        () => MAX_QUESTIONS_PER_QUIZ_SECTION - activeQuestions.value.length,
      );

      const questionCount = ref(Math.min(10, maxQuestions.value));

      // Make the maxSectionQuestionOptions a computed property based on the questionCount
      // that the user has selected, so if they want to add 10 questions, only let them
      // choose a total of 100 to select those from.
      const maxSectionQuestionOptions = computed(() => questionCount.value * 10);

      const selectPracticeQuiz = computed(() => props.selectPracticeQuiz);

      const {
        numberOfSelectedBookmarks$,
        selectResourcesDescription$,
        questionsFromResources$,
        cannotSelectSomeTopicWarning$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        questionsUnusedInSection$,
        numberOfQuestionsSelected$,
        numberOfQuestionsToAdd$,
        maxNumberOfQuestions$,
        tooManyQuestions$,
        selectQuiz$,
        selectPracticeQuizLabel$,
        numberOfQuestionsLabel$,
        addNumberOfQuestions$,
      } = enhancedQuizManagementStrings;

      const { windowIsSmall } = useKResponsiveWindow();

      /**
       * @type {Ref<QuizExercise[]>} - The uncommitted version of the section's resource_pool
       */
      const workingResourcePool = ref([]);

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
      function removeFromWorkingResourcePool(content) {
        workingResourcePool.value = workingResourcePool.value.filter(obj => obj.id !== content.id);
      }

      /**
       * @affects workingResourcePool - Resets the workingResourcePool to the previous state
       */
      function resetWorkingResourcePool() {
        workingResourcePool.value = [];
      }

      // Function to calculate the total number of questions currently selected for a node
      // use this in order to do accurate counts for enabling/disabling checkboxes
      function selectedQuestionsFromNode(content) {
        if (content.kind === ContentNodeKinds.EXERCISE) {
          return workingResourcePool.value.some(wr => wr.id === content.id)
            ? unusedQuestionsCount(content)
            : 0;
        }
        return workingResourcePool.value.reduce((acc, wr) => {
          return (
            acc +
            (wr.ancestors.some(ancestor => ancestor.id === content.id)
              ? unusedQuestionsCount(wr)
              : 0)
          );
        }, 0);
      }

      /**
       * @param {QuizExercise} content
       * Check if the content is present in workingResourcePool
       */
      function contentPresentInWorkingResourcePool(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          const selectedQuestionsFromTopic = selectedQuestionsFromNode(content);
          return selectedQuestionsFromTopic >= unusedQuestionsCount(content);
        }
        return workingResourcePool.value.some(wr => wr.id === content.id);
      }

      /**
       * @param {QuizExercise} content
       * Check if the content is partly present in workingResourcePool
       * Only really useful for folders, as resources cannot be partially selected.
       */
      function contentPartlyPresentInWorkingResourcePool(content) {
        if (content.kind !== ContentNodeKinds.TOPIC) {
          return false;
        }
        const selectedQuestionsFromTopic = selectedQuestionsFromNode(content);
        return (
          selectedQuestionsFromTopic > 0 && selectedQuestionsFromTopic < content.num_assessments
        );
      }

      function fetchSearchResults() {
        if (!searchQuery.value) {
          return;
        }
        const getParams = {
          max_results: 25,
          keywords: searchQuery.value,
          kind: ContentNodeKinds.EXERCISE,
        };
        if (selectPracticeQuiz.value) {
          getParams.contains_quiz = true;
        }
        return ContentNodeResource.fetchCollection({ getParams }).then(response => {
          searchResults.value = response.results;
          moreSearchResults.value = response.more;
        });
      }

      function fetchMoreSearchResults() {
        return ContentNodeResource.fetchCollection({
          getParams: moreSearchResults.value,
        }).then(response => {
          searchResults.value = searchResults.value.concat(response.results);
          moreSearchResults.value = response.more;
        });
      }

      const _selectAllState = computed(() => {
        return contentList.value.map(contentPresentInWorkingResourcePool);
      });

      const selectAllChecked = computed(() => {
        return _selectAllState.value.every(Boolean);
      });

      const selectAllIndeterminate = computed(() => {
        return (
          (!selectAllChecked.value && _selectAllState.value.some(Boolean)) ||
          contentList.value.some(contentPartlyPresentInWorkingResourcePool)
        );
      });

      const showSelectAll = computed(() => {
        return (
          !selectPracticeQuiz.value &&
          contentList.value.every(content => nodeIsSelectableOrUnselectable(content)) &&
          // We only show the select all button if both all the checkboxes are enabled,
          // and adding all the currently unselected questions in resources/folders plus
          // those that are already selected (both in this level of the topic tree and elsewhere)
          // would not exceed the maxSectionQuestionOptions.
          // Do this by taking away the selected questions from the total questions in the
          // resource/folder and checking if the sum of all of these is less than or equal to
          // the remaining number of questions that can be added.
          contentList.value.reduce(
            (acc, content) =>
              unusedQuestionsCount(content) - selectedQuestionsFromNode(content) + acc,
            0,
          ) <=
          maxSectionQuestionOptions.value - workingPoolUnusedQuestions.value
        );
      });

      /**
       * @param {Object} param
       * @param {ContentNode} param.content
       * @param {boolean} param.checked
       * @affects workingResourcePool - Adds or removes the content from the workingResourcePool
       * When given a topic, it adds or removes all the exercises in the topic from the
       * workingResourcePool.
       */
      async function toggleSelected({ content, checked }) {
        if (content.is_leaf) {
          content = [content];
        } else {
          // If we already have all of the children locally, and every child is a leaf, we can
          // just add them all to the working resource pool
          if (!content.children.more && !content.children.results.some(n => !n.is_leaf)) {
            content = content.children.results;
          } else {
            // If we don't have all of the children locally, we need to fetch them
            const children = await ContentNodeResource.fetchCollection({
              getParams: {
                descendant_of: content.id,
                available: true,
                kind: ContentNodeKinds.EXERCISE,
              },
            });
            content = children;
          }
        }
        if (checked) {
          if (selectPracticeQuiz.value) {
            resetWorkingResourcePool();
          }
          addToWorkingResourcePool(content);
        } else {
          content.forEach(c => {
            removeFromWorkingResourcePool(c);
          });
        }
      }

      const {
        topic,
        resources,
        loading: quizResourcesLoading,
        fetchQuizResources,
        fetchMoreQuizResources,
        hasMore,
        annotateTopicsWithDescendantCounts,
        setResources,
        loadingMore,
      } = useQuizResources({ topicId, practiceQuiz: selectPracticeQuiz.value });

      // TODO let's not use text for this
      const viewMoreButtonState = computed(() => {
        if (loadingMore.value) {
          return ViewMoreButtonStates.LOADING;
        }
        if (hasMore.value || moreSearchResults.value) {
          return ViewMoreButtonStates.HAS_MORE;
        }
        return ViewMoreButtonStates.NO_MORE;
      });

      const { searchTerms, search } = useBaseSearch({ descendant: topic });
      search();

      const _loading = ref(true);

      const channels = ref([]);
      const bookmarks = ref([]);
      const searchResults = ref([]);
      const moreSearchResults = ref(null);

      const unusedQuestionsCount = useMemoize(content => {
        if (content.kind === ContentNodeKinds.EXERCISE) {
          const questionItems = content.assessmentmetadata.assessment_item_ids.map(
            aid => `${content.id}:${aid}`,
          );
          const questionsItemsAlreadyUsed = allQuestionsInQuiz.value
            .map(q => q.item)
            .filter(i => questionItems.includes(i));
          const questionItemsAvailable = questionItems.length - questionsItemsAlreadyUsed.length;
          return questionItemsAvailable;
        }
        if (content.kind === ContentNodeKinds.TOPIC || content.kind === ContentNodeKinds.CHANNEL) {
          const total = content.num_assessments;
          const numberOfQuestionsSelected = allQuestionsInQuiz.value.filter(question => {
            const questionNode = allResourceMap.value[question.exercise_id];
            for (const ancestor of questionNode.ancestors) {
              if (ancestor.id === content.id) {
                return true;
              }
            }
            return false;
          }).length;
          return total - numberOfQuestionsSelected;
        }
        return -1;
      });

      /** @returns {Boolean} Whether the given node should be displayed with a checkbox
       *  @description Returns true for exercises or folders that have more than 0 unused questions
       *  and adding it would give us fewer than maxSectionQuestionOptions questions
       */
      function nodeIsSelectableOrUnselectable(node) {
        // For practice quizzes, we only want to allow selection of resources, not folders.
        if (selectPracticeQuiz.value && node.kind === ContentNodeKinds.EXERCISE) {
          return true;
        }
        if (selectPracticeQuiz.value) {
          return false;
        }
        if (
          contentPresentInWorkingResourcePool(node) ||
          contentPartlyPresentInWorkingResourcePool(node)
        ) {
          // If a node has been selected or partly selected, always allow it to be deselected.
          return true;
        }
        // If a node has not been selected, only allow it to be selected if it has unused questions
        // and adding it would not exceed the remaining maxSectionQuestionOptions.
        const count = unusedQuestionsCount(node);
        return (
          count > 0 && count + workingPoolUnusedQuestions.value <= maxSectionQuestionOptions.value
        );
      }

      function showCheckbox(node) {
        // We only show checkboxes for exercises, not topics for practice quizzes
        if (selectPracticeQuiz.value) {
          return node.kind === ContentNodeKinds.EXERCISE;
        }
        // Otherwise we show checkboxes for exercises and topics
        // but not channels.
        return node.kind === ContentNodeKinds.EXERCISE || node.kind === ContentNodeKinds.TOPIC;
      }

      // Load up the channels
      function handleTopicIdChange() {
        const promises = [];
        if (topicId.value) {
          promises.push(fetchQuizResources());
        } else {
          promises.push(
            ContentNodeResource.fetchBookmarks({
              params: { limit: 25, available: true, kind: ContentNodeKinds.EXERCISE },
            }).then(data => {
              const isPracticeQuiz = item =>
                !selectPracticeQuiz.value || get(item, ['options', 'modality'], false) === 'QUIZ';
              bookmarks.value = data.results ? data.results.filter(isPracticeQuiz) : [];
            }),
          );

          promises.push(
            ChannelResource.fetchCollection({
              getParams: {
                contains_exercise: true,
                available: true,
                contains_quiz: selectPracticeQuiz.value ? true : null,
              },
            }).then(response => {
              setResources(
                annotateTopicsWithDescendantCounts(
                  response.map(chnl => {
                    return {
                      ...chnl,
                      id: chnl.root,
                      title: chnl.name,
                      kind: ContentNodeKinds.CHANNEL,
                      is_leaf: false,
                    };
                  }),
                ).then(annotatedResources => {
                  // When we don't have a topicId we're setting the value of
                  // useQuizResources.resources to the value of the channels
                  // (treating those channels as the topics) -- we then call
                  // this annotateTopicsWithDescendantCounts method to ensure
                  // that the channels are annotated with their num_assessments
                  setResources(annotatedResources);
                  channels.value = annotatedResources;
                }),
              );
            }),
          );
        }
        Promise.all(promises).then(() => {
          _loading.value = false;
        });
      }

      // Do initial data loading on create
      if (searchQuery.value) {
        fetchSearchResults();
      } else {
        handleTopicIdChange();
      }

      const loading = computed(() => {
        return _loading.value || quizResourcesLoading.value;
      });

      const contentList = computed(() => {
        /*
      if (!topicId.value) {
        return channels.value;
      }
      */
        if (showBookmarks.value) {
          return bookmarks.value.map(item => ({ ...item, is_leaf: true }));
        }

        if (searchQuery.value) {
          return searchResults.value;
        }

        if (!topicId.value) {
          return channels.value;
        }

        return resources.value;
      });

      // This ought to be sure that we're updating our resources whenever the topicId changes
      // without remounting the whole component
      watch(topicId, handleTopicIdChange);

      watch(searchQuery, fetchSearchResults);

      function fetchMoreResources() {
        if (searchQuery.value) {
          return fetchMoreSearchResults();
        }
        return fetchMoreQuizResources();
      }

      function handleCancelClose() {
        showCloseConfirmation.value = false;
      }

      function handleConfirmClose() {
        context.emit('closePanel');
      }

      const workingPoolHasChanged = computed(() => {
        return Boolean(workingResourcePool.value.length);
      });

      const workingPoolUnusedQuestions = computed(() => {
        return workingResourcePool.value.reduce((acc, content) => {
          return acc + unusedQuestionsCount(content);
        }, 0);
      });

      const tooManyQuestions = computed(() => {
        // Always allow one resource to be selected, just in case
        // the exercise a user wants to use exceeds the maxSectionQuestionOptions
        // with only its own unused questions.
        return (
          workingResourcePool.value.length !== 1 &&
          workingPoolUnusedQuestions.value > maxSectionQuestionOptions.value
        );
      });

      const disableSave = computed(() => {
        if (selectPracticeQuiz.value) {
          return !workingPoolHasChanged.value;
        }
        return (
          !workingPoolHasChanged.value ||
          workingPoolUnusedQuestions.value < questionCount.value ||
          questionCount.value < 1 ||
          tooManyQuestions.value ||
          questionCount.value > maxQuestions.value
        );
      });

      function handleSelectAll(isChecked) {
        for (const content of contentList.value) {
          if (nodeIsSelectableOrUnselectable(content)) {
            toggleSelected({ content, checked: isChecked });
          }
        }
      }

      return {
        showSearch: ref(false),
        nodeIsSelectableOrUnselectable,
        showCheckbox,
        displaySectionTitle,
        unusedQuestionsCount,
        activeSection,
        activeSectionIndex,
        activeQuestions,
        addSection,
        selectAllChecked,
        selectAllIndeterminate,
        showSelectAll,
        handleSelectAll,
        toggleSelected,
        workingPoolHasChanged,
        tooManyQuestions,
        handleConfirmClose,
        handleCancelClose,
        topic,
        contentList,
        showCloseConfirmation,
        loading,
        loadingMore,
        fetchMoreResources,
        resetWorkingResourcePool,
        contentPresentInWorkingResourcePool,
        contentPartlyPresentInWorkingResourcePool,
        questionCount,
        maxQuestions,
        maxSectionQuestionOptions,
        workingPoolUnusedQuestions,
        disableSave,
        cannotSelectSomeTopicWarning$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        numberOfQuestionsSelected$,
        tooManyQuestions$,
        maxNumberOfQuestions$,
        numberOfSelectedBookmarks$,
        questionsUnusedInSection$,
        selectResourcesDescription$,
        questionsFromResources$,
        windowIsSmall,
        bookmarks,
        viewMoreButtonState,
        updateSection,
        addQuestionsToSectionFromResources,
        workingResourcePool,
        showBookmarks,
        selectQuiz$,
        numberOfQuestionsToAdd$,
        selectPracticeQuizLabel$,
        numberOfQuestionsLabel$,
        addNumberOfQuestions$,
        searchTerms,
      };
    },
    props: {
      selectPracticeQuiz: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      isTopicIdSet() {
        return this.$route.params.topic_id;
      },

      getBookmarksLink() {
        // Inject the showBookmarks parameter so that
        // the resourceSelection component now renderes only the
        // the exercises that are bookmarked for the Quiz selection.
        return {
          ...this.$route,
          query: { showBookmarks: true },
        };
      },
      channelsLink() {
        return {
          name: this.$route.name,
          params: {
            ...this.$route.params,
            topic_id: null,
          },
        };
      },
      showNumberOfQuestionsWarning() {
        if (this.selectPracticeQuiz) {
          return false;
        }
        return !this.showSelectAll;
      },
      borderStyle() {
        return `border: 1px solid ${this.$themeTokens.fineLine}`;
      },
      dividerStyle() {
        return `color : ${this.$themeTokens.fineLine}`;
      },
      /*
    selectAllIsVisible() {
      TO BE IMPLEMENTED IN https://github.com/learningequality/kolibri/issues/11734
      Should only be visible if there are any checkboxes at all -- we'll only be showing
      checkboxes for Exercises, not topics
    },
    */
    },
    watch: {
      bookmarks(newVal) {
        this.bookmarksCount = newVal.length;
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
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
      },
      contentLink(content) {
        const { name, params, query } = this.$route;
        if (!content.is_leaf) {
          // Link folders to their page
          return {
            name,
            params: {
              ...params,
              topic_id: content.id,
            },
          };
        }
        // Just return the current route; router-link will handle the no-op from here
        return { name, params, query };
      },
      topicsLink(topic_id) {
        return this.contentLink({ id: topic_id });
      },
      saveSelectedResource() {
        if (this.selectPracticeQuiz) {
          if (this.workingResourcePool.length !== 1) {
            throw new Error('Only one resource can be selected for a practice quiz');
          }
          const remainder = exerciseToQuestionArray(this.workingResourcePool[0]);

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
        } else {
          this.addQuestionsToSectionFromResources({
            sectionIndex: this.activeSectionIndex,
            resourcePool: this.workingResourcePool,
            questionCount: this.questionCount,
          });
        }

        this.resetWorkingResourcePool();
        this.$router.replace({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            ...this.$route.params,
          },
        });
      },
      // The message put onto the content's card when listed
      selectionMetadata(content) {
        if (this.selectPracticeQuiz) {
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
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .select-resource {
    padding-bottom: 6em;
  }

  .title-style {
    font-size: 1.4em;
    font-weight: 600;
  }

  .bookmark-container {
    display: flex;
    min-height: 141px;
    margin-bottom: 24px;
    border-radius: 2px;
    box-shadow:
      0 1px 5px 0 #a1a1a1,
      0 2px 2px 0 #e6e6e6,
      0 3px 1px -2px #ffffff;
    transition: box-shadow 0.25s ease;
  }

  .mobile-bookmark-container {
    @extend %dropshadow-2dp;

    display: flex;
    max-width: 100%;
    min-height: 141px;
    margin: auto;
    margin-bottom: 24px;
    border-radius: 2px;

    .ease:hover {
      @extend %dropshadow-6dp;
      @extend %md-decelerate-func;

      transition: all $core-time;
    }
  }

  .mobile-bookmark-icon {
    left: 24px !important;
  }

  .mobile-text {
    margin-top: 20px;
    margin-left: 60px;
  }

  .bookmark-container:hover {
    box-shadow:
      0 5px 5px -3px #a1a1a1,
      0 8px 10px 1px #d1d1d1,
      0 3px 14px 2px #d4d4d4;
  }

  .text {
    margin-left: 15rem;
  }

  .bottom-navigation {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 1em;
    line-height: 2.5em;
    text-align: center;
    background-color: white;
    border-top: 1px solid black;
  }

  .select-folder-style {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }

  .align-select-folder-style {
    margin-top: 2em;
  }

  .shadow {
    box-shadow:
      0 1px 3px 0 rgba(0, 0, 0, 0.2),
      0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 2px 1px -1px rgba(0, 0, 0, 0.12);
  }

  // Force the leaf nodes not to look like a link
  /deep/ .is-leaf.content-card {
    cursor: default;
    box-shadow:
      0 1px 5px 0 #a1a1a1,
      0 2px 2px 0 #e6e6e6,
      0 3px 1px -2px #ffffff;
  }

  .number-question {
    display: inline-flex;
  }

  .group-button-border {
    display: inline-flex;
    align-items: center;
    height: 3.5em;
    border: 1px solid;
  }

  .divider {
    display: block;
    min-width: 100%;
    height: 1px;
    margin: 24px 0;
    overflow-y: hidden;
  }

</style>
