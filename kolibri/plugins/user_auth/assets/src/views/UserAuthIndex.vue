<template>

  <div>
    <UserAuthLayout>
      <router-view />
    </UserAuthLayout>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import UserAuthLayout from './UserAuthLayout';

  export default {
    name: 'UserAuthIndex',
    components: { UserAuthLayout },
    mixins: [commonCoreStrings],
    computed: {
      redirect: {
        get() {
          return this.$store.state.signIn.redirect;
        },
        set(redirect) {
          this.$store.commit('SET_REDIRECT', redirect);
        },
      },
    },
    created() {
      /*
       * Check for redirect param and store it in vuex
       * otherwise it'll be lost when the route changes.
       */
      if (this.$route.query.redirect) {
        this.redirect = this.$route.query.redirect;
      }
    },
  };

</script>


<style lang="scss" scoped></style>
