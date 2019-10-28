<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="close"
    :immersivePagePrimary="false"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="$tr('createNewExamLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :pageTitle="$tr('createNewExamLabel')"
    :marginBottom="72"
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
          <KTextbox
            ref="questionsInput"
            v-model.trim.number="numQuestions"
            type="number"
            :min="1"
            :max="maxQs"
            :invalid="Boolean(showError && numQuestIsInvalidText)"
            :invalidText="numQuestIsInvalidText"
            :label="$tr('numQuestions')"
            class="number-field"
            @blur="numQuestionsBlurred = true"
          />
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === 1"
            @click="numQuestions -= 1"
          >
            <mat-svg name="remove" category="content" />
          </UiIconButton>
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === maxQs"
            @click="numQuestions += 1"
          >
            <mat-svg name="add" category="content" />
          </UiIconButton>
        </KGridItem>
      </KGrid>

      <h2>{{ $tr('chooseExercises') }}</h2>

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

      <BottomAppBar v-if="inSearchMode">
        <KRouterLink
          appearance="raised-button"
          :text="$tr('exitSearchButtonLabel')"
          primary
          :to="toolbarRoute"
        />
      </BottomAppBar>
      <BottomAppBar v-else>
        <KRouterLink
          appearance="flat-button"
          :text="coreString('goBackAction')"
          :to="toolbarRoute"
        />
        <KButton
          :text="coreString('continueAction')"
          primary
          @click="continueProcess"
        />
      </BottomAppBar>

    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import UiAlert from 'kolibri.coreVue.components.UiAlert';
  import flatMap from 'lodash/flatMap';
  import pickBy from 'lodash/pickBy';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../../../constants/';
  import { MAX_QUESTIONS } from '../../../constants/examConstants';
  import LessonsSearchBox from '../../plan/LessonResourceSelectionPage/SearchTools/LessonsSearchBox';
  import LessonsSearchFilters from '../../plan/LessonResourceSelectionPage/SearchTools/LessonsSearchFilters';
  import ResourceSelectionBreadcrumbs from '../../plan/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs';
  import ContentCardList from '../../plan/LessonResourceSelectionPage/ContentCardList';
  import commonCoach from '../../common';

  export default {
    // TODO: Rename this to 'ExamCreationPage'
    name: 'CreateExamPage',
    components: {
      UiAlert,
      LessonsSearchBox,
      LessonsSearchFilters,
      ResourceSelectionBreadcrumbs,
      ContentCardList,
      UiIconButton,
      BottomAppBar,
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
      pageName() {
        return this.$route.name;
      },
      maxQs() {
        return MAX_QUESTIONS;
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
        const topics = this.contentList.filter(({ kind }) => kind === ContentNodeKinds.TOPIC);
        const exercises = this.contentList.filter(({ kind }) => kind === ContentNodeKinds.EXERCISE);
        const topicExercises = flatMap(topics, ({ exercises }) => exercises);
        return [...exercises, ...topicExercises];
      },
      addableExercises() {
        return this.allExercises.filter(exercise => !this.selectedExercises[exercise.id]);
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
        if (this.numQuestions > this.availableQuestions) {
          return this.$tr('numQuestionsExceed', {
            inputNumQuestions: this.numQuestions,
            maxQuestionsFromSelection: this.availableQuestions,
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
    methods: {
      ...mapActions(['createSnackbar']),
      ...mapActions('examCreation', [
        'addToSelectedExercises',
        'removeFromSelectedExercises',
        'fetchAdditionalSearchResults',
      ]),
      contentLink(content) {
        if (content.kind === ContentNodeKinds.TOPIC || content.kind === ContentNodeKinds.CHANNEL) {
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
        let snackbarString;
        if (isChecked) {
          this.showError = false;
          this.addToSelectedExercises(this.addableExercises);
          snackbarString = 'added';
        } else {
          this.removeFromSelectedExercises(this.allExercises);
          snackbarString = 'removed';
        }
        this.createSnackbar(this.$tr(snackbarString, { item: this.topicTitle }));
      },
      toggleSelected({ checked, contentId }) {
        let exercises;
        let snackbarString;
        const contentNode = this.contentList.find(item => item.id === contentId);
        const isTopic = contentNode.kind === ContentNodeKinds.TOPIC;
        if (checked && isTopic) {
          this.showError = false;
          exercises = contentNode.exercises;
          this.addToSelectedExercises(exercises);
          snackbarString = 'added';
        } else if (checked && !isTopic) {
          this.showError = false;
          exercises = [contentNode];
          this.addToSelectedExercises(exercises);
          snackbarString = 'added';
        } else if (!checked && isTopic) {
          exercises = contentNode.exercises;
          this.removeFromSelectedExercises(exercises);
          snackbarString = 'removed';
        } else if (!checked && !isTopic) {
          exercises = [contentNode];
          this.removeFromSelectedExercises(exercises);
          snackbarString = 'removed';
        }

        if (snackbarString) {
          this.createSnackbar(this.$tr(snackbarString, { item: contentNode.title }));
        }
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
        if (this.numQuestionsInvalid) {
          this.$refs.questionsInput.focus();
        }
        if (this.selectionIsInvalidText) {
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
    },
    $trs: {
      createNewExamLabel: 'Create new quiz',
      chooseExercises: 'Select topics or exercises',
      numQuestions: 'Number of questions',
      numQuestionsBetween: 'Enter a number between 1 and 50',
      numQuestionsExceed:
        'The max number of questions based on the exercises you selected is {maxQuestionsFromSelection}. Select more exercises to reach {inputNumQuestions} questions, or lower the number of questions to {maxQuestionsFromSelection}.',
      noneSelected: 'No exercises are selected',
      exitSearchButtonLabel: 'Exit search',
      // TODO: Handle singular/plural
      selectionInformation:
        '{count, number, integer} of {total, number, integer} resources selected',
      // TODO: Interpolate strings correctly
      /* eslint-disable kolibri/vue-no-unused-translations */
      /* The items below are referred to dynamically */
      added: "Added '{item}'",
      removed: "Removed '{item}'",
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  .search-box {
    display: inline-block;
    vertical-align: middle;
  }

  .buttons-container {
    text-align: right;
    button {
      margin: 0 0 0 16px;
    }
  }

  .items {
    display: inline-block;
  }

  .numItems {
    display: inline-block;
    margin: 8px;
    list-style: none;
  }

  .number-field {
    display: inline-block;
    max-width: 250px;
    margin-right: 8px;
  }

  .number-btn {
    position: relative;
    top: 16px;
    display: inline-block;
    vertical-align: top;
  }

</style>
