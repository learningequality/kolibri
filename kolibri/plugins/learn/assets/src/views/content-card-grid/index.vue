<template>

  <div class="content-grid">
    <header v-if="header" class="content-grid-header">
      <h2> {{header}} </h2>
      <span v-if="subheader"> {{subheader}} </span>
    </header>

    <ui-select
      v-if="filter"
      :label="$tr('display')"
      :options="filterOptions"
      v-model="selectedFilter"
      class="filter"
    />

    <span
      v-for="content in contents" class="content-card"
      v-show="selectedFilter.value === 'all' || selectedFilter.value === content.kind">
      <slot
        :title="content.title"
        :thumbnail="content.thumnail"
        :kind="content.kind"
        :progress="content.progress"
        :id="content.id">

        <content-card
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :link="genLink(content.id, content.kind)"/>

      </slot>
    </span>

  </div>

</template>


<script>

  import validateLinkObject from 'kolibri.utils.validateLinkObject';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import some from 'lodash/some';
  import forEach from 'lodash/forEach';
  import uiSelect from 'keen-ui/src/UiSelect';
  import contentCard from '../content-card';

  export default {
    $trNameSpace: 'contentCardGrid',
    $trs: {
      display: 'Display',
      all: 'All content ({ count, number })',
      topics: 'Topics ({ count, number })',
      exercises: 'Exercises ({ count, number })',
      videos: 'Videos ({ count, number })',
      audio: 'Audio ({ count, number })',
      documents: 'Documents ({ count, number })',
      html5: 'HTML5 Apps ({ count, number })',
    },
    components: {
      contentCard,
      uiSelect,
    },
    props: {
      contents: {
        type: Array,
        required: true,
      },
      header: {
        type: String,
        required: false,
      },
      subheader: {
        type: String,
        required: false,
      },
      genLink: {
        type: Function,
        validator(value) {
          return validateLinkObject(value(1, 'exercise'));
        },
        default: () => {},
        required: false,
      },
      filter: {
        type: Boolean,
        default: true,
      },
    },
    data: () => ({ selectedFilter: '' }),
    computed: {
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
      filterOptions() {
        const options = [
          {
            label: this.$tr('all', { count: this.contents.length }),
            value: 'all',
          },
        ];
        const kindLabelsMap = {
          [ContentNodeKinds.TOPIC]: this.$tr('topics', { count: this.topics.length }),
          [ContentNodeKinds.EXERCISE]: this.$tr('exercises', { count: this.exercises.length }),
          [ContentNodeKinds.VIDEO]: this.$tr('videos', { count: this.videos.length }),
          [ContentNodeKinds.AUDIO]: this.$tr('audio', { count: this.audio.length }),
          [ContentNodeKinds.DOCUMENT]: this.$tr('documents', { count: this.documents.length }),
          [ContentNodeKinds.HTML5]: this.$tr('html5', { count: this.html5.length }),
        };
        forEach(kindLabelsMap, (value, key) => {
          if (this.contentsContain(key)) {
            options.push({
              label: value,
              value: key,
            });
          }
        });
        return options;
      },
    },
    methods: {
      contentsContain(kind) {
        return some(this.contents, content => content.kind === kind);
      },
    },
    mounted() {
      this.selectedFilter = this.filterOptions[0];
    },
    vuex: { getters: { channelId: state => state.core.channels.currentId } },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .content-card
    display: inline-block
    margin: 10px

  .filter
    width: 200px
    margin-top: 2em

</style>
