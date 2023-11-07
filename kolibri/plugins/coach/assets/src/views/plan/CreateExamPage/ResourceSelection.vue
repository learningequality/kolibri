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

    <LessonsSearchBox
      ref="textbox"
      placeholder="search by keyword"
      searchTerm="searchTerm"
      :inputPlaceHolderStyle="inputPlaceHolderStyle"
      @searchterm="search"
    />

    <p
      class="section-topic-style"
    >
      Addition and subtraction within 20A
    </p>
    <p
      class="section-subtopic-style"
    >
      Learn to add and subtract numbers that are 20 or less.
    </p>

    <div class="select-all-style">
      <KIcon
        icon="indeterminateCheck"
      />
      <span
        class="space-content-left"
      >
        select all
      </span>
    </div>
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import LessonsSearchBox from './../LessonResourceSelectionPage/SearchTools/LessonsSearchBox.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      LessonsSearchBox,
    },
    setup() {
      const { sectionSettings$ } = enhancedQuizManagementStrings;

      return {
        sectionSettings$,
      };
    },
    methods: {
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
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
.section-topic-style{
  font-weight:600;
  font-size: 1.4em;
}
.section-subtopic-style{
  font-size: 1.2em;
}
.select-all-style{
  font-size:1.2em;
  font-weight:600;
  display: inline-flex;
  justify-content: space-between;
}
.space-content-left{
  margin-left: .5em;
}
</style>
