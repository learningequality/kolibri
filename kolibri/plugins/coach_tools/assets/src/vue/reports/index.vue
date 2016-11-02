<template>

  <div>
    <h1>Reports</h1>

    <!--USER BREADCRUMBS-->
    <breadcrumbs :list="ancestors"></breadcrumbs>

    <!--SUMMARY SECTION-->
    <summary-section></summary-section>

    <!--VIEW BY RADIOS-->
    <p v-if="topic_view">View by:
      <input type="radio" id="content" value="content" v-model="contentOrLearnersView">
      <label for="content">content</label>
      <input type="radio" id="learners" value="learners" v-model="contentOrLearnersView">
      <label for="learners">learners</label>
    </p>

    <!--LIST SECTION-->
    <list-section></list-section>
  </div>

</template>


<script>

  module.exports = {

    components: {
      'breadcrumbs': require('./breadcrumbs'),
      'summary-section': require('./summary-section'),
      'list-section': require('./list-section'),
    },

    data: () => ({
      ancestors: [
        { name: 'ALL Learners', id: '123' },
        { name: 'Aaron Dude' },
      ],
      topic_view: true,
      contentOrLearnersView: 'content',

    }),

  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
