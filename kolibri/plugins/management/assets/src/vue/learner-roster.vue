<template>

  <div class="roster">
    <user-modal></user-modal>
    <input type="search" placeholder="Search for learner...">
    <div>
      <button @click="openModal">+ Learner</button>
      <button>A-Z</button>
      <button>Z-A</button>
    </div>
    <div class="learner-roster">
      <ul>
        <li v-for="learner in getLearners">
          <input type="checkbox">
          <span class="vertical-divider">|</span>
          <a href="#">{{ learner.last_name + ", " + learner.first_name }}</a>
          <button>Manage</button>
        </li>
      </ul>
    </div>
  </div>
  <div class="sidebar">
    <div class="learner-count">
      <div>Total:</div>
      <div>{{ getLearners.length }}</div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'user-modal': require('./user-modal.vue'),
    },
    methods: {
      openModal() {
        console.log(this.getLearners);
        return 2;
      },
    },
    vuex: {
      getters: {
        getLearners: state => state.learners,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .roster, .sidebar
    display: inline-block

  .learner-count
    border: solid, 1px, black
  .learner-roster
    height: 300px
    overflow:hidden
    overflow-y:scroll

</style>
