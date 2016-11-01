<template>

  <div>
    <button>Recent</button>
    <button>Topics</button>
    <breadcrumbs :list="contentBreadcrumbs">Content Breadcrumbs</breadcrumbs>
    <h1>
      <span v-if="user_name">{{ user_name }} - </span>
      <span>{{ kind_icon }}</span>
      {{ content_name }}
    </h1>
    <p v-if="topic">{{ excercise_count }} Excercise - {{ content_count }} Contents</p>
    <div>Exercises
      <progress-bar :progress-percent="50"></progress-bar>
    </div>
    <div>Content
      <progress-bar :progress-percent="50"></progress-bar>
    </div>

    <p v-if="topic_view">View by:
      <input type="radio" id="content" value="content" v-model="contentOrLearnersView">
      <label for="content">content</label>
      <input type="radio" id="learners" value="learners" v-model="contentOrLearnersView">
      <label for="learners">learners</label>
    </p>


  </div>

</template>


<script>

 module.exports = {
  data: () => ({
    user_name: 'Aaron Dude',
    kind_icon: 'video_icon',
    content_name: 'Content Name',
    contentOrLearnersView: 'content',
    topic_view: true,
    ancestors: [
    {name: 'Math Fundamentals', 'id': '1234'},
    {name: 'Unicef Channel', 'id': '123'},
    ]
  }),
  components: {
    'breadcrumbs': require('../breadcrumbs'),
  },
  computed: {
    contentBreadcrumbs() {
      console.log('before', this.ancestors);
      let ancestors = this.ancestors;
      let list = ancestors.push({name: this.content_name, id: '1234545'});
      console.log('after', list);
      return this.ancestors;
    }
  }
};

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
