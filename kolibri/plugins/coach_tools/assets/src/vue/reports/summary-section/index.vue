<template>

  <div>

    <!--TABS-->
    <button v-bind:class="{ active: !topic_view }">Recent</button>
    <button v-bind:class="{ active: topic_view }">Topics</button>

    <div class="summary-section">
      <!--CONTENT BREADCRUMBS-->
      <breadcrumbs :list="breadcrumbsList">Content Breadcrumbs</breadcrumbs>


      <!--TITLE-->
      <h2>
        <span v-if="user_name">{{ user_name }} - </span>
        <span>{{ kind_icon }}</span>
        {{ content_name }}
      </h2>


      <!--TOPIC/CHANNEL-->
      <div v-if="kind == 'topic'">
        <p>{{ exercise_count }} Exercises - {{ content_count }} Contents</p>
        <p>Last Active: {{ last_active }}</p>

        <div>
          <p>Exercises</p>
          <progress-bar :progress-percent="exercise_progress"></progress-bar>
        </div>

        <div>
          <p>Content</p>
          <progress-bar :progress-percent="content_progress"></progress-bar>
        </div>

      </div>


      <!--EXERCISE-->
      <div v-if="kind == 'exercise'">
        <p>{{ questions_count }} Questions - Mastery Model: {{ mastery_model }}</p>
        <p>Last Active: {{ last_active }}</p>

        <div v-if="user_name">
          <p>{{ questions_answered }} Questions Answered - {{ attempts }} Attempts - {{ time_spent }} - {{ date_mastered
            }}</p>
        </div>

        <div v-else>
          <p>Mastered:</p>
          <p>{{ exercise_mastered }} / {{ exercise_total }} Learners</p>
        </div>

      </div>


      <!--VIDEO/AUDIO-->
      <div v-if="kind == 'video' ">
        <p>{{ duration }}</p>
        <p>Last Active: {{ last_active }}</p>

        <div v-if="user_name">
          <p>{{ time_spent }}</p>
          <progress-bar :progress-percent="video_progress"></progress-bar>
        </div>

        <div v-else>
          <progress-bar :progress-percent="video_progress"></progress-bar>
        </div>

      </div>


      <!--DOCUMENT-->
      <div v-if="kind == 'document' || 'audio'">
        <p>{{ pages }} Pages</p>
        <p>Last Active: {{ last_active }}</p>

        <div v-if="user_name">
          <p>
            <span v-if="document_progress == 1.000">Viewed - {{ time_spent }}</span>
            <span v-else>Not Viewed</span>
          </p>
        </div>

        <div v-else>
          <progress-bar :progress-percent="document_progress"></progress-bar>
        </div>

      </div>
    </div>

  </div>

</template>


<script>

  module.exports = {

    components: {
      'breadcrumbs': require('../breadcrumbs'),
    },

    data: () => ({
      user_name: 'Aaron Dude',
      content_name: 'Content Name',
      ancestors: [
        {name: 'Grandparent', 'id': '123'},
        {name: 'Parent', 'id': '1234'},
      ],
      kind: 'document',
      kind_icon: 'video_icon',
      last_active: 'Nov 1 2016',
      exercise_count: 50,
      content_count: 20,
      exercise_progress: 50,
      content_progress: 20,
      questions_count: 20,
      mastery_model: '3 out of 5 correct',
      questions_answered: 20,
      attempts: 40,
      time_spent: '3:40:32',
      exercise_mastered: 20,
      exercise_total: 100,
      date_mastered: 'Oct 31 2016',
      video_progress: 75,
      pages: 300,
      document_progress: 1.000,
      topic_view: true,
    }),

    computed: {
      breadcrumbsList() {
        let breadcrumbsList = this.ancestors;
        breadcrumbsList.push({name: this.content_name});
        return breadcrumbsList;
      }
    },

  };


</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .summary-section
    background-color white

</style>
