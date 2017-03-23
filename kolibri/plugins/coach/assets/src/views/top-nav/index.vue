<template>

  <div class="top">
    <div class="links">
      <router-link :to="resentPageLink" :class="{active: recentPageActive}" @click.native="blur">
        {{$tr('recent')}}
      </router-link>
      <router-link :to="topicsPageLink" :class="{active: topicsPageActive}" @click.native="blur">
        {{$tr('topics')}}
      </router-link>
      <router-link :to="examsPageLink" :class="{active: examsPageActive}" @click.native="blur">
        {{$tr('exams')}}
      </router-link>
      <router-link :to="learnersPageLink" :class="{active: learnersPageActive}" @click.native="blur" v-if="isDeviceOwner">
        {{$tr('learners')}}
      </router-link>
      <router-link :to="groupsPageLink" :class="{active: groupsPageActive}" @click.native="blur" v-if="isDeviceOwner">
        {{$tr('groups')}}
      </router-link>
    </div>
  </div>

</template>


<script>

  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;
  const constants = require('../../constants');

  module.exports = {
    $trNameSpace: 'topNav',
    $trs: {
      recent: 'Recent',
      topics: 'Topics',
      exams: 'Exams',
      learners: 'Learners',
      groups: 'Groups',
    },
    methods: {
      blur(evt) {
        evt.target.blur();
      },
    },
    computed: {
      // active tabs
      recentPageActive() {
        return this.pageName === constants.PageNames.RECENT;
      },
      topicsPageActive() {
        return this.pageName === constants.PageNames.TOPICS;
      },
      examsPageActive() {
        return this.pageName === constants.PageNames.EXAMS;
      },
      learnersPageActive() {
        return this.pageName === constants.PageNames.LEARNERS;
      },
      groupsPageActive() {
        return this.pageName === constants.PageNames.GROUPS;
      },
      // page links
      resentPageLink() {
        return { name: constants.PageNames.RECENT };
      },
      topicsPageLink() {
        return { name: constants.PageNames.TOPICS };
      },
      examsPageLink() {
        return { name: constants.PageNames.EXAMS };
      },
      learnersPageLink() {
        return { name: constants.PageNames.LEARNERS };
      },
      groupsPageLink() {
        return { name: constants.PageNames.GROUPS };
      },
    },
    vuex: {
      getters: {
        isDeviceOwner: state => state.core.session.kind[0] === UserKinds.SUPERUSER,
        pageName: state => state.pageName,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  .top
    position: relative
    padding: 1em 2em
    background: $core-bg-light
    border-radius: $radius
  .top a
    padding: 0.6em 2em
    text-decoration: none
    color: $core-text-annotation
  .top .active
    color: $core-text-default
    cursor: default
    border-bottom: 0.3em $core-action-normal solid

</style>
