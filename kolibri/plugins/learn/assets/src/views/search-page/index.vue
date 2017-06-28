<template>

  <div>

    <h3>Search</h3>

    <search-box/>

    <p v-if="!searchTerm">{{ $tr('noSearch') }}</p>

    <template v-else>
      <h1 class="search-results">{{ $tr('showingResultsFor', { searchTerm }) }}</h1>
      <p class="search-channel">{{ $tr('withinChannel', { channelName }) }}</p>

      <tabs>
        <tab-button
          type="icon-and-title"
          :title="$tr('all', { num: contents.length } )"
          icon="layers"
          @click="filter = 'all'"
          :selected="filter === 'all'"
        />
        <tab-button
          type="icon-and-title"
          :title="$tr('topics', { num: topics.length } )"
          icon="folder"
          :selected="filter === contentNodeKinds.TOPIC"
          @click="filter = contentNodeKinds.TOPIC"
        />
        <tab-button
          type="icon-and-title"
          :title="$tr('exercises', { num: exercises.length } )"
          icon="assignment"
          :selected="filter === contentNodeKinds.EXERCISE"
          @click="filter = contentNodeKinds.EXERCISE"
        />
        <tab-button
          type="icon-and-title"
          :title="$tr('videos', { num: videos.length } )"
          icon="ondemand_video"
          :selected="filter === contentNodeKinds.VIDEO"
          @click="filter = contentNodeKinds.VIDEO"
        />
        <tab-button
          type="icon-and-title"
          :title="$tr('audio', { num: audio.length } )"
          icon="audiotrack"
          :selected="filter === contentNodeKinds.AUDIO"
          @click="filter = contentNodeKinds.AUDIO"
        />
        <tab-button
          type="icon-and-title"
          :title="$tr('documents', { num: documents.length } )"
          icon="book"
          :selected="filter === contentNodeKinds.DOCUMENT"
          @click="filter = contentNodeKinds.DOCUMENT"
        />
        <tab-button
          type="icon-and-title"
          icon="widgets"
          :title="$tr('html5', { num: html5.length } )"
          :selected="filter === contentNodeKinds.HTML5"
          @click="filter = contentNodeKinds.HTML5"
        />
      </tabs>

      <p v-if="filteredResults.length === 0">{{ noResultsMsg }}</p>

      <content-card-grid v-else :contents="filteredResults">
        <template scope="content">
          <content-card
            v-show="filter === 'all' || filter === content.kind"
            :key="content.id"
            :title="content.title"
            :thumbnail="content.thumbnail"
            :progress="content.progress"
            :kind="content.kind"
            :link="genLink(content)"
          />
        </template>
      </content-card-grid>

    </template>

  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../../constants';
  import { getCurrentChannelObject as GetCurrentChannelObject } from 'kolibri.coreVue.vuex.getters';
  import contentCard from '../content-card';
  import contentCardGrid from '../content-card-grid';
  import searchBox from '../search-box';
  import tabs from 'kolibri.coreVue.components.tabs';
  import tabButton from 'kolibri.coreVue.components.tabButton';
  export default {
    $trNameSpace: 'learnSearch',
    $trs: {
      noSearch: 'Search by typing something in the search box above',
      showingResultsFor: 'Search results for "{searchTerm}"',
      withinChannel: 'Within {channelName}',
      all: 'All ({ num, number })',
      content: 'Content',
      exercises: 'Exercises ({ num, number })',
      videos: 'Videos ({ num, number })',
      audio: 'Audio ({ num, number })',
      topics: 'Topics ({ num, number })',
      documents: 'Documents ({ num, number })',
      html5: 'HTML5 apps ({ num, number })',
      noContent: 'No content matches "{searchTerm}"',
      noExercises: 'No exercises match "{searchTerm}"',
      noVideos: 'No videos match "{searchTerm}"',
      noAudio: 'No audio matches "{searchTerm}"',
      noTopics: 'No topics match "{searchTerm}"',
      noDocuments: 'No documents match "{searchTerm}"',
      noHtml5: 'No HTML5 apps match "{searchTerm}"',
    },
    components: {
      contentCard,
      contentCardGrid,
      tabs,
      tabButton,
      searchBox,
    },
    data() {
      return { filter: 'all' };
    },
    computed: {
      contentNodeKinds() {
        return ContentNodeKinds;
      },
      topics() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.TOPIC);
      },
      exercises() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.EXERCISE);
      },
      videos() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.VIDEO);
      },
      audio() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.AUDIO);
      },
      documents() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.DOCUMENT);
      },
      html5() {
        return this.contents.filter(content => content.kind === ContentNodeKinds.HTML5);
      },
      filteredResults() {
        if (this.filter === ContentNodeKinds.TOPIC) {
          return this.topics;
        } else if (this.filter === ContentNodeKinds.EXERCISE) {
          return this.exercises;
        } else if (this.filter === ContentNodeKinds.VIDEO) {
          return this.videos;
        } else if (this.filter === ContentNodeKinds.AUDIO) {
          return this.audio;
        } else if (this.filter === ContentNodeKinds.DOCUMENT) {
          return this.documents;
        } else if (this.filter === ContentNodeKinds.HTML5) {
          return this.html5;
        }
        return this.contents;
      },
      noResultsMsg() {
        if (this.filter === ContentNodeKinds.TOPIC) {
          return this.$tr('noTopics', { searchTerm: this.searchTerm });
        } else if (this.filter === ContentNodeKinds.EXERCISE) {
          return this.$tr('noExercises', { searchTerm: this.searchTerm });
        } else if (this.filter === ContentNodeKinds.VIDEO) {
          return this.$tr('noVideos', { searchTerm: this.searchTerm });
        } else if (this.filter === ContentNodeKinds.AUDIO) {
          return this.$tr('noAudio', { searchTerm: this.searchTerm });
        } else if (this.filter === ContentNodeKinds.DOCUMENT) {
          return this.$tr('noDocuments', { searchTerm: this.searchTerm });
        } else if (this.filter === ContentNodeKinds.HTML5) {
          return this.$tr('noHtml5', { searchTerm: this.searchTerm });
        }
        return this.$tr('noContent', { searchTerm: this.searchTerm });
      },
    },
    methods: {
      genLink(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: {
              channel_id: this.channelId,
              id: content.id,
            },
          };
        }
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: {
            channel_id: this.channelId,
            id: content.id,
          },
        };
      },
    },
    vuex: {
      getters: {
        contents: state => state.pageState.contents,
        searchTerm: state => state.pageState.searchTerm,
        channelId: state => state.core.channels.currentId,
        channelName: state => GetCurrentChannelObject(state).title,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .search-results
    margin-top: 32px

  .search-channel
    font-size: smaller

</style>
