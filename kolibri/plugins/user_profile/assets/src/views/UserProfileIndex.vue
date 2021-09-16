<template>

  <div>
    <router-view />
  </div>

</template>


<script>

  export default {
    name: 'UserProfileIndex',
    created() {
      this.$store.commit('SET_APPBAR_TITLE', this.$tr('userProfileTitle'));
    },
    $trs: {
      userProfileTitle: {
        message: 'Profile',
        context:
          'The user profile contains detailed information about the user such as their name or user type.\n\nThis text is visible upon selecting the username in the top right part of the screen once signed in.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
