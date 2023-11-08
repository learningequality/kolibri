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
      style="margin-top:1em;"
      @searchterm="search"
    />

    <!-- <ChannelCard
      :key="1"
      channel="channel"
      searchTerm="searchTerm"
      searchTermHasChanged="searchTermHasChanged"
      search="search"
    />
    <ChannelCard
      :key="1"
      channel="channel"
      searchTerm="searchTerm"
      searchTermHasChanged="searchTermHasChanged"
      search="search"
    />
    <ChannelCard
      :key="1"
      channel="channel"
      searchTerm="searchTerm"
      searchTermHasChanged="searchTermHasChanged"
      search="search"
    />
    <ChannelCard
      :key="1"
      channel="channel"
      searchTerm="searchTerm"
      searchTermHasChanged="searchTermHasChanged"
      search="search"
    /> -->
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import LessonsSearchBox from './../LessonResourceSelectionPage/SearchTools/LessonsSearchBox.vue';
  import BookMarkedResource from './BookMarkedResource.vue';
  // import ChannelCard from './ChannelCard.vue';

  export default {
    name: 'ResourceSelection',
    components: {
      LessonsSearchBox,
      BookMarkedResource,
      // ChannelCard,
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
</style>
