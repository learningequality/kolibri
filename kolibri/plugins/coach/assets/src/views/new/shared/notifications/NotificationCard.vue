<template>

  <router-link
    class="notification"
    :to="route"
  >
    <div>
      <p class="context">{{ context }}</p>
      <p class="text"><slot></slot></p>
    </div>
  </router-link>

</template>


<script>

  import imports from '../../imports';

  export default {
    name: 'NotificationCard',
    mixins: [imports],
    props: {
      targetPage: {
        type: String,
        required: true,
      },
      // group name
      learnerContext: {
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
        if (this.learnerContext && this.contentContext) {
          return `${this.learnerContext} • ${this.contentContext}`;
        } else if (this.learnerContext) {
          return this.learnerContext;
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
    padding: 8px;
    color: black;
    text-decoration: none;
    border-top: 1px solid gray;
  }

  .notification:hover {
    background-color: #eeeeee;
  }

  .context {
    margin-top: 0;
    margin-bottom: 4px;
    font-size: small;
    color: gray;
  }

  .text {
    margin-top: 0;
    margin-bottom: 0;
  }

</style>
