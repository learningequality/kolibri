<template>

  <router-link
    class="notification"
    :to="route"
  >
    <p>{{ context }}</p>
    <p><slot></slot></p>
  </router-link>

</template>


<script>

  export default {
    name: 'NotificationCard',
    props: {
      targetPage: {
        type: String,
        required: true,
      },
      // group name
      userContext: {
        type: String,
        required: false,
      },
      // exam or lesson name
      contentContext: {
        type: String,
        required: false,
      },
    },
    computed: {
      route() {
        return { name: 'NEW_COACH_PAGES', params: { page: this.targetPage } };
      },
      context() {
        if (this.userContext && this.contentContext) {
          return `${this.userContext} • ${this.userContext}`;
        } else if (this.userContext) {
          return this.userContext;
        } else if (this.contentContext) {
          return this.contentContext;
        }
        return '';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .notification {
    display: block;
    color: black;
    text-decoration: none;
    border-top: 1px solid gray;
  }

</style>
