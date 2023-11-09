<template>

  <div class="select-resource">
    <h5
      class="title-style"
    >
      <KIcon
        icon="back"
      />
      Select folders or exercises from these channels
    </h5>
    <p>Select from bookmarks</p>

    <BookMarkedResource />

    <LessonsSearchBox
      ref="textbox"
      placeholder="search by keyword"
      searchTerm="searchTerm"
      :inputPlaceHolderStyle="inputPlaceHolderStyle"
      style="margin-top:1em;margin-bottom:1em;"
      @searchterm="search"
    />
    <LessonContentCard

      title="content.title"
      thumbnail="content.thumbnail"
      description="content.description"
      kind="content.kind"
      message="contentCardMessage(content)"
      link="contentCardLink(content)"
      numCoachContents="content.num_coach_contents"
      isLeaf="content.is_leaf"
    />
    <LessonContentCard
      title="content.title"
      thumbnail="content.thumbnail"
      description="content.description"
      kind="content.kind"
      message="contentCardMessage(content)"
      link="contentCardLink(content)"
      numCoachContents="content.num_coach_contents"
      isLeaf="content.is_leaf"
    />

    <ContentCardList
      :contentList="filteredContentList"
      :contentCardMessage="selectionMetadata"
      :contentCardLink="contentLink"
      :viewMoreButtonState="viewMoreButtonState"
      :contentIsChecked="contentIsSelected"
      :contentHasCheckbox="contentHasCheckbox"
    />

    <!-- <div
      v-for="content in filteredContentList"
    >
      <LessonContentCard
        :class="{ 'with-checkbox': needCheckboxes }"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :description="content.description"
        :kind="content.kind"
        :message="contentCardMessage(content)"
        :link="contentCardLink(content)"
        :numCoachContents="content.num_coach_contents"
        :isLeaf="content.is_leaf"
      />

    </div> -->

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { PageNames } from '../../../constants';
  import LessonsSearchBox from './../LessonResourceSelectionPage/SearchTools/LessonsSearchBox.vue';
  import BookMarkedResource from './BookMarkedResource.vue';
  import ContentCardList from './../LessonResourceSelectionPage/ContentCardList.vue';
  import LessonContentCard from './../LessonResourceSelectionPage/LessonContentCard/index.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      LessonsSearchBox,
      BookMarkedResource,
      ContentCardList,
      LessonContentCard,
    },
    setup() {
      const { sectionSettings$ } = enhancedQuizManagementStrings;

      return {
        sectionSettings$,
      };
    },
    data() {
      return {
        viewMoreButtonState: 'no_more_results',
        contentHasCheckbox: () => false,
        contentIsSelected: () => '',
      };
    },
    computed: {
      ...mapState('examCreation', ['contentList']),
      filteredContentList() {
        console.log(this.contentList);
        return this.contentList;
      },
    },
    methods: {
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
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
          return this.$tr('total_number', { count, total });
        }
        return '';
      },
      contentLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.EXAM_CREATION_SELECT_PRACTICE_QUIZ_TOPIC,
            params: {
              classId: this.classId,
              topicId: content.id,
            },
          };
        }

        const value = content.assessmentmetadata.assessment_item_ids.length;
        this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);

        return {
          name: PageNames.EXAM_CREATION_PRACTICE_QUIZ_PREVIEW,
          params: {
            classId: this.classId,
            contentId: content.id,
          },
        };
      },
    },
    $trs: {
      total_number: {
        message: 'Channels',
      },
    },
  };

</script>


<style scoped>
.select-resource{
  margin-top: -4em;
}
.title-style{
  font-weight:600;
  font-size: 1.4em;
}
</style>
