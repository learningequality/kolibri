<template>

  <div class="header-container">
    <div class="header">
      <h1>{{ title }}</h1>
      <div>
        <slot name="actions"></slot>
      </div>
    </div>
    <div class="class-name-label">
      <KIcon
        icon="classes"
        class="class-name-icon"
      />
      <span>{{ className }}</span>
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';

  export default {
    name: 'CoachHeader',
    props: {
      title: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapState('classSummary', { className: 'name' }),
    },
  };

</script>


<style scoped>

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .class-name-icon {
    position: relative;
    top: 0.4em;
    width: 1.5em;
    height: 1.5em;
    margin-right: 0.5em;
  }

  .class-name-label {
    margin-bottom: 16px;
  }

</style>
