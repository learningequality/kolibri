<template>

  <div class="select-resource">
    <div v-if="loading && !loadingMore">
      <KCircularLoader />
    </div>
    <div v-else>

      <h5 v-if="selectPracticeQuiz" class="select-folder-style">
        {{ selectPracticeQuizLabel$() }}
      </h5>
      <KGrid v-else>
        <KGridItem
          :layout12="{ span: 6 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: 2 }"
        >
          <h5 class="select-folder-style">
            {{ selectResourcesDescription$() }}
          </h5>
          <span>
            {{
              maxNumberOfQuestionsPerSection$({
                count: MAX_QUESTIONS_PER_QUIZ_SECTION, current: activeQuestions.length
              })
            }}
          </span>
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
                v-model="questionCount"
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
                <span
                  :style="dividerStyle"
                > | </span>
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
        </KGridItem>
      </KGrid>

      <div v-if="!isTopicIdSet && bookmarks.length && !showBookmarks">

        <p>{{ selectFromBookmarks$() }}</p>

        <div>
          <KRouterLink
            :appearanceOverrides="{
              width: '100%',
              textDecoration: 'none',
              color: $themeTokens.text
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

      <div
        v-if="showTopicSizeWarning"
        class="shadow"
        :style=" { padding: '1em', marginBottom: '1em', backgroundColor: $themePalette.grey.v_100 }"
      >
        {{ cannotSelectSomeTopicWarning$() }}
      </div>

      <ResourceSelectionBreadcrumbs
        v-if="isTopicIdSet"
        :ancestors="[...topic.ancestors, topic]"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      />

      <LessonsSearchBox
        v-if="!showBookmarks"
        @clear="clearSearchTerm"
        @searchterm="handleSearchTermChange"
      />

      <ContentCardList
        :contentList="contentList"
        :showSelectAll="showSelectAll"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="selectAllChecked"
        :selectAllIndeterminate="selectAllIndeterminate"
        :contentIsChecked="contentPresentInWorkingResourcePool"
        :contentHasCheckbox="actuallyHasCheckbox"
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
        :loadingMoreState="loadingMore"
        :showRadioButtons="selectPracticeQuiz"
        @changeselectall="handleSelectAll"
        @change_content_card="toggleSelected"
        @moreresults="fetchMoreResources"
      >
        <template #notice="{ content }">
          <span style="position: absolute; bottom: 1em;">{{ cardNoticeContent(content) }}</span>
        </template>
      </ContentCardList>

      <div class="bottom-navigation">
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <span v-if="!selectPracticeQuiz">
              {{
                questionsFromResources$({
                  questions: workingPoolUnusedQuestions, resources: workingResourcePool.length
                })
              }}
            </span>
          </KGridItem>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              style="float: right;"
              :text="selectPracticeQuiz ? selectQuiz$() :
                addNumberOfQuestions$({ count: Math.max(1, questionCount) })
              "
              :primary="true"
              :disabled="disableSave"
              @click="saveSelectedResource"
            />
          </KGridItem>
        </KGrid>
      </div>
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
  </div>

</template>


<script>

  import get from 'lodash/get';
  import uniqWith from 'lodash/uniqWith';
  import isEqual from 'lodash/isEqual';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { computed, ref, getCurrentInstance, watch } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ContentNodeResource, ChannelResource } from 'kolibri.resources';
  import { ContentNodeKinds, MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri.coreVue.vuex.constants';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { exerciseToQuestionArray } from '../../../utils/selectQuestions';
  import { PageNames, ViewMoreButtonStates } from '../../../constants/index';
  import BookmarkIcon from '../LessonResourceSelectionPage/LessonContentCard/BookmarkIcon.vue';
  import useQuizResources from '../../../composables/useQuizResources';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import LessonsSearchBox from '../LessonResourceSelectionPage/SearchTools/LessonsSearchBox.vue';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';
  import ResourceSelectionBreadcrumbs from './../LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      ContentCardList,
      BookmarkIcon,
      LessonsSearchBox,
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
        activeSectionIndex,
        allResourceMap,
        updateSection,
        addQuestionsToSectionFromResources,
        selectAllQuestions,
        allQuestionsInQuiz,
        activeQuestions,
        addSection,
      } = injectQuizCreation();
      const showCloseConfirmation = ref(false);
      const maxQuestions = computed(
        () => MAX_QUESTIONS_PER_QUIZ_SECTION - activeQuestions.value.length
      );
      const questionCount = ref(Math.min(10, maxQuestions.value));

      const selectPracticeQuiz = computed(() => props.selectPracticeQuiz);

      const {
        sectionSettings$,
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        selectResourcesDescription$,
        questionsFromResources$,
        changesSavedSuccessfully$,
        selectedQuestionsInformation$,
        cannotSelectSomeTopicWarning$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        questionsUnusedInSection$,
        selectQuiz$,
        selectPracticeQuizLabel$,
        numberOfQuestionsLabel$,
        maxNumberOfQuestions$,
        maxNumberOfQuestionsPerSection$,
        addNumberOfQuestions$,
      } = enhancedQuizManagementStrings;

      // TODO let's not use text for this
      const viewMoreButtonState = computed(() => {
        if (hasMore.value || moreSearchResults.value) {
          return ViewMoreButtonStates.HAS_MORE;
        } else {
          return ViewMoreButtonStates.NO_MORE;
        }
      });

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
          isEqual
        );
      }

      /**
       * @description Returns the list of Exercises which can possibly be selected from the current
       * contentList taking into consideration the logic for whether a topic can be selected or not.
       * @returns {QuizExercise[]} - All contents which can be selected
       */
      function selectableContentList() {
        return contentList.value.reduce((newList, content) => {
          if (content.kind === ContentNodeKinds.TOPIC && actuallyHasCheckbox(content)) {
            newList = [...newList, ...content.children.results];
          } else {
            newList.push(content);
          }
          return newList;
        }, []);
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

      /**
       * @param {QuizExercise} content
       * Check if the content is present in workingResourcePool
       */
      function contentPresentInWorkingResourcePool(content) {
        const workingResourceIds = workingResourcePool.value.map(wr => wr.id);
        if (content.kind === ContentNodeKinds.TOPIC) {
          return content.children.results.every(child => workingResourceIds.includes(child.id));
        }
        return workingResourceIds.includes(content.id);
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

      const selectAllChecked = computed(() => {
        // Returns true if all the resources in the topic are in the working resource pool
        const workingResourceIds = workingResourcePool.value.map(wr => wr.id);
        const selectableIds = selectableContentList().map(content => content.id);
        return selectableIds.every(id => workingResourceIds.includes(id));
      });

      const selectAllIndeterminate = computed(() => {
        // Returns true if some, but not all, of the resources in the topic are in the working
        // resource
        const workingResourceIds = workingResourcePool.value.map(wr => wr.id);
        const selectableIds = selectableContentList().map(content => content.id);
        return !selectAllChecked.value && selectableIds.some(id => workingResourceIds.includes(id));
      });

      const showSelectAll = computed(() => {
        return (
          !selectPracticeQuiz.value &&
          contentList.value.every(content => actuallyHasCheckbox(content))
        );
      });

      function handleSelectAll(isChecked) {
        if (isChecked) {
          addToWorkingResourcePool(selectableContentList());
        } else {
          contentList.value.forEach(content => {
            var contentToRemove = [];
            if (content.kind === ContentNodeKinds.TOPIC) {
              contentToRemove = content.children.results;
            } else {
              contentToRemove.push(content);
            }
            contentToRemove.forEach(c => {
              removeFromWorkingResourcePool(c);
            });
          });
        }
      }

      /**
       * @param {Object} param
       * @param {ContentNode} param.content
       * @param {boolean} param.checked
       * @affects workingResourcePool - Adds or removes the content from the workingResourcePool
       * When given a topic, it adds or removes all the exercises in the topic from the
       * workingResourcePool. This assumes that topics which should not be added are not able to
       * be checked and does not do any additional checks.
       */
      function toggleSelected({ content, checked }) {
        content = content.kind === ContentNodeKinds.TOPIC ? content.children.results : [content];
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
        hasCheckbox,
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

      const _loading = ref(true);

      const channels = ref([]);
      const bookmarks = ref([]);
      const searchResults = ref([]);
      const moreSearchResults = ref(null);

      function unusedQuestionsCount(content) {
        if (content.kind === ContentNodeKinds.EXERCISE) {
          const questionItems = content.assessmentmetadata.assessment_item_ids.map(
            aid => `${content.id}:${aid}`
          );
          const questionsItemsAlreadyUsed = allQuestionsInQuiz.value
            .map(q => q.item)
            .filter(i => questionItems.includes(i));
          const questionItemsAvailable = questionItems.length - questionsItemsAlreadyUsed.length;
          return questionItemsAvailable;
        }
        return -1;
      }
      /**
       * Uses the imported `hasCheckbox` method in addition to some locally relevant conditions
       * to identify if the content has a checkbox.
       * For Exercises, we make sure there are questions available in the resource
       * For Topics, we make sure that there are questions available in the children
       * -- Note that for topics, hasCheckbox will only be true if all children are Exercises,
       *    so we can call this recursively without worrying about it going too deep
       */
      function actuallyHasCheckbox(content) {
        return content.kind === ContentNodeKinds.EXERCISE
          ? hasCheckbox(content) && unusedQuestionsCount(content) > 0
          : hasCheckbox(content) && content.children.results.some(actuallyHasCheckbox);
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
            })
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
                  })
                ).then(annotatedResources => {
                  // When we don't have a topicId we're setting the value of
                  // useQuizResources.resources to the value of the channels
                  // (treating those channels as the topics) -- we then call
                  // this annotateTopicsWithDescendantCounts method to ensure
                  // that the channels are annotated with their num_assessments
                  setResources(annotatedResources);
                  channels.value = annotatedResources;
                })
              );
            })
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
        return workingResourcePool.value.length;
      });

      const workingPoolUnusedQuestions = computed(() => {
        return workingResourcePool.value.reduce((acc, content) => {
          return acc + unusedQuestionsCount(content);
        }, 0);
      });

      const disableSave = computed(() => {
        if (selectPracticeQuiz.value) {
          return !workingPoolHasChanged.value;
        }
        return (
          !workingPoolHasChanged.value ||
          workingPoolUnusedQuestions.value < questionCount.value ||
          questionCount.value > maxQuestions.value ||
          questionCount.value < 1
        );
      });

      return {
        actuallyHasCheckbox,
        unusedQuestionsCount,
        activeSectionIndex,
        activeQuestions,
        addSection,
        allResourceMap,
        allQuestionsInQuiz,
        selectAllChecked,
        selectAllIndeterminate,
        showSelectAll,
        handleSelectAll,
        toggleSelected,
        workingPoolHasChanged,
        handleConfirmClose,
        handleCancelClose,
        topic,
        topicId,
        contentList,
        resources,
        showCloseConfirmation,
        loading,
        hasMore,
        loadingMore,
        fetchMoreResources,
        resetWorkingResourcePool,
        contentPresentInWorkingResourcePool,
        questionCount,
        maxQuestions,
        MAX_QUESTIONS_PER_QUIZ_SECTION,
        workingPoolUnusedQuestions,
        disableSave,
        cannotSelectSomeTopicWarning$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        changesSavedSuccessfully$,
        sectionSettings$,
        selectFromBookmarks$,
        numberOfSelectedBookmarks$,
        questionsUnusedInSection$,
        selectResourcesDescription$,
        questionsFromResources$,
        windowIsSmall,
        bookmarks,
        channels,
        viewMoreButtonState,
        updateSection,
        addQuestionsToSectionFromResources,
        selectAllQuestions,
        workingResourcePool,
        addToWorkingResourcePool,
        removeFromWorkingResourcePool,
        showBookmarks,
        selectedQuestionsInformation$,
        selectQuiz$,
        selectPracticeQuizLabel$,
        numberOfQuestionsLabel$,
        maxNumberOfQuestions$,
        maxNumberOfQuestionsPerSection$,
        addNumberOfQuestions$,
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
      showTopicSizeWarning() {
        return this.contentList.some(this.showTopicSizeWarningCard);
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
      cardNoticeContent(content) {
        if (content.kind === ContentNodeKinds.EXERCISE) {
          return this.questionsUnusedInSection$({
            count: this.unusedQuestionsCount(content),
          });
        } else {
          return '';
        }
      },
      showTopicSizeWarningCard(content) {
        return (
          !this.selectPracticeQuiz &&
          !this.actuallyHasCheckbox(content) &&
          content.kind === ContentNodeKinds.TOPIC
        );
      },
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
      },
      contentLink(content) {
        if (!content.is_leaf) {
          const { name, params } = this.$route;
          // Link folders to their page
          return {
            name,
            params: {
              ...params,
              topic_id: content.id,
            },
          };
        }
        return {}; // Or this could be how we handle leaf nodes if we wanted them to link somewhere
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
        this.$store.dispatch('createSnackbar', this.changesSavedSuccessfully$());
      },
      // The message put onto the content's card when listed
      selectionMetadata(content) {
        if (this.selectPracticeQuiz || content.kind !== ContentNodeKinds.TOPIC) {
          return;
        }
        const total = content.num_assessments;
        const numberOfQuestionsSelected = this.allQuestionsInQuiz.filter(question => {
          const questionNode = this.allResourceMap[question.exercise_id];
          for (const ancestor of questionNode.ancestors) {
            if (ancestor.id === content.id) {
              return true;
            }
          }
          return false;
        }).length;

        return this.selectedQuestionsInformation$({
          count: numberOfQuestionsSelected,
          total: total,
        });
      },
      handleSearchTermChange(searchTerm) {
        const query = {
          ...this.$route.query,
          search: searchTerm,
        };
        this.$router.push({ query });
      },
      clearSearchTerm() {
        const query = {
          ...this.$route.query,
        };
        delete query.search;
        this.$router.push({ query });
      },
    },
  };

</script>


<style scoped lang="scss">

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
    box-shadow: 0 1px 5px 0 #a1a1a1, 0 2px 2px 0 #e6e6e6, 0 3px 1px -2px #ffffff;
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
      @extend %dropshadow-8dp;
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
    box-shadow: 0 5px 5px -3px #a1a1a1, 0 8px 10px 1px #d1d1d1, 0 3px 14px 2px #d4d4d4;
  }

  .text {
    margin-left: 15rem;
  }

  .bottom-navigation {
    position: absolute;
    right: 0;
    bottom: 1.5em;
    left: 0;
    width: 100%;
    padding: 1em;
    text-align: center;
    background-color: white;
    border-top: 1px solid black;

    span {
      line-height: 2.5em;
    }
  }

  .select-folder-style {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    font-size: 18px;
  }

  .align-select-folder-style {
    margin-top: 2em;
  }

  .shadow {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 2px 1px -1px rgba(0, 0, 0, 0.12);
  }

  // Force the leaf nodes not to look like a link
  /deep/ .is-leaf.content-card {
    cursor: default;
    box-shadow: 0 1px 5px 0 #a1a1a1, 0 2px 2px 0 #e6e6e6, 0 3px 1px -2px #ffffff;
  }

  .number-question {
    display: inline-flex;
    float: right;
  }

  .group-button-border {
    display: inline-flex;
    align-items: center;
    height: 3.5em;
    border: 1px solid;
  }

</style>
