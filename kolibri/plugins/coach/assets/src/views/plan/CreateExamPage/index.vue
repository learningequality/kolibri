<template>

  <CoachImmersivePage
    :appBarTitle="$tr('createNewExamLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    icon="close"
    :pageTitle="$tr('createNewExamLabel')"
    :route="toolbarRoute"
  >

    <KPageContainer>

      <h1>{{ $tr('createNewExamLabel') }}</h1>

      <UiAlert
        v-if="showError && !inSearchMode"
        type="error"
        :dismissible="false"
      >
        {{ selectionIsInvalidText }}
      </UiAlert>

      <h2>{{ coachString('detailsLabel') }}</h2>

      <KGrid>
        <KGridItem :layout12="{ span: 6 }">
          <KTextbox
            ref="title"
            v-model.trim="examTitle"
            :label="coachString('titleLabel')"
            :autofocus="true"
            :maxlength="100"
          />
        </KGridItem>
        <KGridItem :layout12="{ span: 6 }">
          <KGrid>
            <KGridItem
              :layout4="{ span: 2 }"
              :layout8="{ span: 5 }"
              :layout12="{ span: 8 }"
            >
              <KTextbox
                ref="questionsInput"
                v-model.trim.number="numQuestions"
                type="number"
                :min="1"
                :max="maxQs"
                :invalid="Boolean(showError && numQuestIsInvalidText)"
                :invalidText="numQuestIsInvalidText"
                :label="$tr('numQuestions')"
                @blur="handleNumberQuestionsBlur"
              />
            </KGridItem>
            <KGridItem
              :layout4="{ span: 2 }"
              :layout8="{ span: 3 }"
              :layout12="{ span: 4 }"
              :style="{ marginTop: '16px' }"
            >
              <KIconButton
                icon="minus"
                aria-hidden="true"
                class="number-btn"
                :disabled="numQuestions === 1"
                @click="numQuestions -= 1"
              />
              <KIconButton
                icon="plus"
                aria-hidden="true"
                class="number-btn"
                :disabled="numQuestions === maxQs"
                @click="numQuestions += 1"
              />
            </KGridItem>
          </KGrid>
        </KGridItem>
      </KGrid>

      <h2>{{ $tr('chooseExercises') }}</h2>
      <div v-if="bookmarksRoute">
        <strong>
          <KRouterLink
            :text="coreString('channelsLabel')"
            :to="channelsLink"
          />
        </strong>
        <ContentCardList
          :contentList="bookmarks"
          :contentHasCheckbox="contentHasCheckbox"
          :contentCardMessage="() => ''"
          :selectAllChecked="selectAllChecked"
          :selectAllIndeterminate="selectAllIndeterminate"
          :contentCardLink="bookmarksLink"
          :contentIsChecked="contentIsSelected"
          :viewMoreButtonState="viewMoreButtonState"
          :showSelectAll="selectAllIsVisible"
          :contentIsIndeterminate="contentIsIndeterminate"
          @changeselectall="toggleTopicInWorkingResources"
          @change_content_card="toggleSelected"
          @moreresults="handleMoreResults"
        />
      </div>
      <div v-if="examCreationRoute">
        <p v-if="bookmarksCount">
          {{ coreString('selectFromBookmarks') }}
        </p>
        <KRouterLink
          v-if="bookmarksCount"
          :style="{ width: '100%' }"
          :to="getBookmarksLink()"
        >
          <div class="bookmark-container">
            <BookmarkIcon />
            <div class="text">
              <h3>{{ coreString('bookmarksLabel') }}</h3>
              <p>{{ $tr('resources', { count: bookmarksCount }) }}</p>
            </div>
          </div>
        </KRouterLink>
      </div>

      <div v-if="examCreationRoute || examTopicRoute || inSearchMode">
        <LessonsSearchBox
          class="search-box"
          @searchterm="handleSearchTerm"
        />

        <LessonsSearchFilters
          v-if="inSearchMode"
          v-model="filters"
          :searchTerm="searchTerm"
          :searchResults="searchResults"
        />
        <ResourceSelectionBreadcrumbs
          v-else
          :ancestors="ancestors"
          :channelsLink="channelsLink"
          :topicsLink="topicsLink"
        />
        <h2>{{ topicTitle }}</h2>
        <p>{{ topicDescription }}</p>
        <ContentCardList
          :contentList="filteredContentList"
          :showSelectAll="selectAllIsVisible"
          :viewMoreButtonState="viewMoreButtonState"
          :selectAllChecked="selectAllChecked"
          :selectAllIndeterminate="selectAllIndeterminate"
          :contentIsChecked="contentIsSelected"
          :contentIsIndeterminate="contentIsIndeterminate"
          :contentHasCheckbox="contentHasCheckbox"
          :contentCardMessage="selectionMetadata"
          :contentCardLink="contentLink"
          @changeselectall="toggleTopicInWorkingResources"
          @change_content_card="toggleSelected"
          @moreresults="handleMoreResults"
        />
      </div>
      <BottomAppBar v-if="inSearchMode">
        <KRouterLink
          appearance="raised-button"
          :text="$tr('exitSearchButtonLabel')"
          primary
          :to="topicRoute"
        />
      </BottomAppBar>
      <BottomAppBar v-else>
        <KButtonGroup>
          <KButton
            :text="coreString('continueAction')"
            primary
            :disabled="!exercisesHaveBeenSelected"
            @click="continueProcess"
          />
        </KButtonGroup>
      </BottomAppBar>

    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import flatMap from 'lodash/flatMap';
  import pickBy from 'lodash/pickBy';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ContentNodeResource } from 'kolibri.resources';
  import { PageNames } from '../../../constants/';
  import { MAX_QUESTIONS } from '../../../constants/examConstants';
  import LessonsSearchBox from '../../plan/LessonResourceSelectionPage/SearchTools/LessonsSearchBox';
  import LessonsSearchFilters from '../../plan/LessonResourceSelectionPage/SearchTools/LessonsSearchFilters';
  import ResourceSelectionBreadcrumbs from '../../plan/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs';
  import ContentCardList from '../../plan/LessonResourceSelectionPage/ContentCardList';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import BookmarkIcon from '../LessonResourceSelectionPage/LessonContentCard/BookmarkIcon';

  export default {
    // TODO: Rename this to 'ExamCreationPage'
    name: 'CreateExamPage',
    components: {
      UiAlert,
      CoachImmersivePage,
      LessonsSearchBox,
      LessonsSearchFilters,
      ResourceSelectionBreadcrumbs,
      ContentCardList,
      BottomAppBar,
      BookmarkIcon,
    },
    mixins: [commonCoreStrings, commonCoach, responsiveWindowMixin],
    data() {
      return {
        showError: false,
        moreResultsState: null,
        // null corresponds to 'All' filter value
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        numQuestionsBlurred: false,
        bookmarksCount: 0,
        bookmarks: [],
        more: null,
      };
    },
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapGetters('examCreation', ['numRemainingSearchResults']),
      ...mapState('examCreation', [
        'numberOfQuestions',
        'contentList',
        'selectedExercises',
        'availableQuestions',
        'searchResults',
        'ancestors',
      ]),
      topicRoute() {
        if (this.$route.query.last_id) {
          return {
            name: PageNames.EXAM_CREATION_TOPIC,
            params: {
              topicId: this.$route.query.last_id,
            },
          };
        } else {
          return this.toolbarRoute;
        }
      },
      pageName() {
        return this.$route.name;
      },
      maxQs() {
        return MAX_QUESTIONS;
      },
      bookmarksRoute() {
        return (
          this.pageName === PageNames.EXAM_CREATION_BOOKMARKS_MAIN ||
          this.pageName === PageNames.EXAM_CREATION_BOOKMARKS
        );
      },
      examCreationRoute() {
        return this.pageName === PageNames.EXAM_CREATION_ROOT;
      },

      examTopicRoute() {
        return this.pageName === PageNames.EXAM_CREATION_TOPIC;
      },

      examTitle: {
        get() {
          return this.$store.state.examCreation.title;
        },
        set(value) {
          this.$store.commit('examCreation/SET_TITLE', value);
        },
      },
      numQuestions: {
        get() {
          return this.numberOfQuestions;
        },
        set(value) {
          // If value in the input doesn't match state, update it
          if (value !== Number(this.$refs.questionsInput.currentText)) {
            this.$refs.questionsInput.currentText = value;
          }
          // If it is cleared out, then set vuex state to null so it can be caught during
          // validation
          if (value === '') {
            this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', null);
          }
          if (value && value >= 1 && value <= this.maxQs) {
            this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);
            this.$store.dispatch('examCreation/updateSelectedQuestions');
          }
        },
      },
      filteredContentList() {
        const { role } = this.filters || {};
        if (!this.inSearchMode) {
          return this.contentList;
        }
        return this.searchResults.results.filter(contentNode => {
          let passesFilters = true;
          if (role === 'nonCoach') {
            passesFilters = passesFilters && contentNode.num_coach_contents === 0;
          }
          if (role === 'coach') {
            passesFilters = passesFilters && contentNode.num_coach_contents > 0;
          }
          return passesFilters;
        });
      },
      allExercises() {
        if (this.contentList) {
          const topics = this.contentList.filter(({ kind }) => kind === ContentNodeKinds.TOPIC);
          const exercises = this.contentList.filter(
            ({ kind }) => kind === ContentNodeKinds.EXERCISE
          );
          const topicExercises = flatMap(topics, ({ exercises }) => exercises);
          return [...exercises, ...topicExercises];
        } else if (this.bookmarks) {
          return this.bookmarks;
        }
        return [];
      },
      addableExercises() {
        return this.allExercises.filter(exercise => !this.selectedExercises[exercise.id]);
      },
      exercisesHaveBeenSelected() {
        return Object.keys(this.selectedExercises).length > 0;
      },
      selectAllChecked() {
        return this.addableExercises.length === 0;
      },
      selectAllIndeterminate() {
        if (this.selectAllChecked) {
          return false;
        }
        return this.addableExercises.length !== this.allExercises.length;
      },
      inSearchMode() {
        return this.pageName === PageNames.EXAM_CREATION_SEARCH;
      },
      searchTerm() {
        return this.$route.params.searchTerm;
      },
      selectAllIsVisible() {
        return !this.inSearchMode && this.pageName !== PageNames.EXAM_CREATION_ROOT;
      },
      viewMoreButtonState() {
        if (!this.inSearchMode) {
          return 'no_more_results';
        }
        if (this.moreResultsState === 'waiting' || this.moreResultsState === 'error') {
          return this.moreResultsState;
        }
        if (!this.numRemainingSearchResults) {
          return 'no_more_results';
        }
        return 'visible';
      },
      selectionIsInvalidText() {
        if (Object.keys(this.selectedExercises).length === 0) {
          return this.$tr('noneSelected');
        }
        return null;
      },
      channelsLink() {
        return {
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: this.classId,
          },
        };
      },
      topicTitle() {
        if (!this.ancestors.length) {
          return '';
        }
        return this.ancestors[this.ancestors.length - 1].title;
      },
      topicDescription() {
        if (!this.ancestors.length) {
          return '';
        }
        return this.ancestors[this.ancestors.length - 1].description;
      },
      numQuestIsInvalidText() {
        if (this.numQuestions === '') {
          return this.$tr('numQuestionsBetween');
        }
        if (this.numQuestions < 1 || this.numQuestions > 50) {
          return this.$tr('numQuestionsBetween');
        }
        if (!Number.isInteger(this.numQuestions)) {
          return this.$tr('numQuestionsBetween');
        }
        if (this.availableQuestions === 0) {
          return this.$tr('noneSelected');
        }
        if (this.availableQuestions == 0 || this.availableQuestions == null) {
          return this.$tr('numQuestionsExceedNoExercises', {
            inputNumQuestions: this.numQuestions,
            maxQuestionsFromSelection: 0,
          });
        }
        if (this.numQuestions > this.availableQuestions) {
          return this.$tr('numQuestionsExceed', {
            inputNumQuestions: this.numQuestions,
            maxQuestionsFromSelection: String(this.availableQuestions),
          });
        }
        return null;
      },
    },
    watch: {
      filters(newVal) {
        this.$router.push({
          query: { ...this.$route.query, ...pickBy(newVal) },
        });
      },
    },
    created() {
      ContentNodeResource.fetchBookmarks({
        params: { limit: 25, kind: ContentNodeKinds.EXERCISE, available: true },
      }).then(data => {
        this.more = data.more;
        this.bookmarks = data.results;
        this.bookmarksCount = data.count;
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('examCreation', [
        'addToSelectedExercises',
        'removeFromSelectedExercises',
        'fetchAdditionalSearchResults',
      ]),
      getBookmarksLink() {
        return {
          name: PageNames.EXAM_CREATION_BOOKMARKS_MAIN,
        };
      },
      bookmarksLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.EXAM_CREATION_BOOKMARKS,
            params: {
              classId: this.classId,
              topicId: content.id,
            },
          };
        }
        const { query } = this.$route;
        return {
          name: PageNames.EXAM_CREATION_PREVIEW,
          params: {
            classId: this.classId,
            contentId: content.id,
          },
          query: {
            ...query,
            ...pickBy({
              searchTerm: this.$route.params.searchTerm,
            }),
          },
        };
      },
      contentLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.EXAM_CREATION_TOPIC,
            params: {
              classId: this.classId,
              topicId: content.id,
            },
          };
        }
        const { query } = this.$route;
        return {
          name: PageNames.EXAM_CREATION_PREVIEW,
          params: {
            classId: this.classId,
            contentId: content.id,
          },
          query: {
            ...query,
            ...pickBy({
              searchTerm: this.$route.params.searchTerm,
            }),
          },
        };
      },
      contentHasCheckbox() {
        return this.pageName !== PageNames.EXAM_CREATION_ROOT;
      },
      contentIsSelected(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          return content.exercises.every(exercise => Boolean(this.selectedExercises[exercise.id]));
        } else {
          return Boolean(this.selectedExercises[content.id]);
        }
      },
      contentIsIndeterminate(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          const everyExerciseSelected = content.exercises.every(exercise =>
            Boolean(this.selectedExercises[exercise.id])
          );
          if (everyExerciseSelected) {
            return false;
          }
          return content.exercises.some(exercise => Boolean(this.selectedExercises[exercise.id]));
        }
        return false;
      },
      selectionMetadata(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          const count = content.exercises.filter(exercise =>
            Boolean(this.selectedExercises[exercise.id])
          ).length;
          if (count === 0) {
            return '';
          }
          const total = content.exercises.length;
          return this.$tr('selectionInformation', { count, total });
        }
        return '';
      },
      toggleTopicInWorkingResources(isChecked) {
        if (isChecked) {
          this.showError = false;
          // NOTE must call snackbar first before mutating the exercise list
          this.showSnackbarNotification('resourcesAddedWithCount', {
            count: this.addableExercises.length,
          });
          this.addToSelectedExercises(this.addableExercises);
        } else {
          this.showSnackbarNotification('resourcesRemovedWithCount', {
            count: this.allExercises.length,
          });
          this.removeFromSelectedExercises(this.allExercises);
        }
      },
      toggleSelected({ content, checked }) {
        let exercises;
        const list =
          this.contentList && this.contentList.length ? this.contentList : this.bookmarks;
        const contentNode = list.find(item => item.id === content.id);
        const isTopic = contentNode.kind === ContentNodeKinds.TOPIC;
        if (checked && isTopic) {
          this.showError = false;
          exercises = contentNode.exercises;
          this.addToSelectedExercises(exercises);
        } else if (checked && !isTopic) {
          this.showError = false;
          exercises = [contentNode];
          this.addToSelectedExercises(exercises);
        } else if (!checked && isTopic) {
          exercises = contentNode.exercises;
          this.removeFromSelectedExercises(exercises);
        } else if (!checked && !isTopic) {
          exercises = [contentNode];
          this.removeFromSelectedExercises(exercises);
        }

        this.showSnackbarNotification(
          checked ? 'resourcesAddedWithCount' : 'resourcesRemovedWithCount',
          { count: exercises.length }
        );
      },
      handleMoreResults() {
        this.moreResultsState = 'waiting';
        this.fetchAdditionalSearchResults({
          searchTerm: this.searchTerm,
          kind: this.filters.kind,
          channelId: this.filters.channel,
          currentResults: this.searchResults.results,
        })
          .then(() => {
            this.moreResultsState = null;
          })
          .catch(() => {
            this.moreResultsState = 'error';
          });
      },
      continueProcess() {
        if (this.selectionIsInvalidText) {
          this.$refs.questionsInput.focus();
          this.showError = true;
        } else {
          this.$router.push({ name: PageNames.EXAM_CREATION_QUESTION_SELECTION });
        }
      },
      handleSearchTerm(searchTerm) {
        const lastId = this.$route.query.last_id || this.$route.params.topicId;
        this.$router.push({
          name: PageNames.EXAM_CREATION_SEARCH,
          params: {
            searchTerm,
          },
          query: {
            last_id: lastId,
          },
        });
      },
      topicsLink(topicId) {
        return {
          name: PageNames.EXAM_CREATION_TOPIC,
          params: {
            classId: this.classId,
            topicId,
          },
        };
      },
      handleNumberQuestionsBlur() {
        this.numQuestionsBlurred = true;
        if (Number(this.$refs.questionsInput.currentText) < 0) {
          this.numQuestions = 1;
        }
        if (Number(this.$refs.questionsInput.currentText) > this.maxQs) {
          this.numQuestions = this.maxQs;
        }
      },
    },
    $trs: {
      resources: {
        message: '{count} {count, plural, one {resource} other {resources}}',
        context: "Only translate 'resource' and 'resources'.",
      },
      createNewExamLabel: {
        message: 'Create new quiz',
        context: "Title of the screen launched from the 'New quiz' button on the 'Plan' tab.",
      },
      chooseExercises: {
        message: 'Select folders or exercises from these channels',
        context:
          'When creating a new quiz, coaches can choose which folders or exercises they want to include in the quiz from the channels that contain exercise resources.',
      },
      numQuestions: {
        message: 'Number of questions',
        context: 'Indicates the number of questions that the quiz will have.',
      },
      numQuestionsBetween: {
        message: 'Enter a number between 1 and 50',
        context:
          "Refers to an error if the coach inputs a number of quiz questions that's not between 1 and 50. Quizzes cannot have less than 1 or more than 50 questions. ",
      },
      numQuestionsExceed: {
        message:
          'The max number of questions based on the exercises you selected is {maxQuestionsFromSelection}. Select more exercises to reach {inputNumQuestions} questions, or lower the number of questions to {maxQuestionsFromSelection}.',
        context:
          'This message displays if the learning resource has less questions than the number selected by the coach initially.',
      },
      numQuestionsExceedNoExercises: {
        message:
          'The max number of questions based on the exercises you selected is 0. Select more exercises to reach {inputNumQuestions} questions.',

        context:
          'This message displays if the learning resource selected by the coach has less questions then the number of questions coach wants to use in the quiz.\n',
      },
      noneSelected: {
        message: 'No exercises are selected',
        context:
          "Error message which displays if no resources have been selected in the 'Create new quiz' screen.",
      },
      exitSearchButtonLabel: {
        message: 'Exit search',
        context:
          "Button to exit the 'Search' page when user searches for resources to use in a quiz.",
      },
      selectionInformation: {
        message:
          '{count, number, integer} of {total, number, integer} {total, plural, one {resource selected} other {resources selected}}',

        context:
          "Indicates the number of resources selected by the coach. For example: '3 of 5 resources selected'.\n\nOnly translate 'of' and 'resource/resources selected'",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .search-box {
    display: inline-block;
    vertical-align: middle;
  }

  .bookmarks-container {
    display: flex;
    align-items: center;
  }

  .lesson-content-card {
    width: 100%;
  }

  .bookmark-container {
    display: flex;
    min-height: 141px;
    margin-bottom: 24px;
    border-radius: 2px;
    box-shadow: 0 1px 5px 0 #a1a1a1, 0 2px 2px 0 #e6e6e6, 0 3px 1px -2px #ffffff;
    transition: box-shadow 0.25s ease;
  }

  .bookmark-container:hover {
    box-shadow: 0 5px 5px -3px #a1a1a1, 0 8px 10px 1px #d1d1d1, 0 3px 14px 2px #d4d4d4;
  }

  .text {
    margin-left: 15rem;
  }

</style>
