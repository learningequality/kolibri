<template>

  <div class="content-grid">
    <ui-select
      v-if="filter"
      :label="$tr('display')"
      :options="filterOptions"
      v-model="selectedFilter"
      class="filter"
    />

    <content-card
      v-for="content in contents"
      v-show="selectedFilter.value === 'all' || selectedFilter.value === content.kind"
      :key="content.id"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :class="{'grid-item': true, 'mobile': isMobile}"
      :kind="content.kind"
      :progress="content.progress"
      :link="genContentLink(content.id, content.kind)"/>

  </div>

</template>


<script>

  import validateLinkObject from 'kolibri.utils.validateLinkObject';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import some from 'lodash/some';
  import forEach from 'lodash/forEach';
  import uiSelect from 'keen-ui/src/UiSelect';
  import contentCard from '../content-card';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    mixins: [responsiveWindow],
    name: 'contentCardGroupGrid',
    $trs: {
      display: 'Display',
      all: 'All content ({ num, number })',
      topics: 'Topics ({ num, number })',
      exercises: 'Exercises ({ num, number })',
      videos: 'Videos ({ num, number })',
      audio: 'Audio ({ num, number })',
      documents: 'Documents ({ num, number })',
      html5: 'HTML5 Apps ({ num, number })',
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
      genContentLink: {
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
      isMobile() {
        return this.windowSize.breakpoint <= 1;
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
      filterOptions() {
        const options = [
          {
            label: this.$tr('all', { num: this.contents.length }),
            value: 'all',
          },
        ];
        const kindLabelsMap = {
          [ContentNodeKinds.TOPIC]: this.$tr('topics', { num: this.topics.length }),
          [ContentNodeKinds.EXERCISE]: this.$tr('exercises', { num: this.exercises.length }),
          [ContentNodeKinds.VIDEO]: this.$tr('videos', { num: this.videos.length }),
          [ContentNodeKinds.AUDIO]: this.$tr('audio', { num: this.audio.length }),
          [ContentNodeKinds.DOCUMENT]: this.$tr('documents', { num: this.documents.length }),
          [ContentNodeKinds.HTML5]: this.$tr('html5', { num: this.html5.length }),
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

  $gutters = 16px

  .grid-item
    margin-right: $gutters
    margin-bottom: $gutters
    &.mobile
      width: 100%

  .filter
    width: 200px
    margin-top: 2em

</style>
