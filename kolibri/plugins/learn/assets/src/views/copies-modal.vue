<template>

  <k-modal
    :title="$tr('copies')"
    :submitText="$tr('close')"
    @submit="closeModal"
    @cancel="closeModal"
  >
    <transition mode="out-in">

      <k-circular-loader
        v-if="loading"
        :delay="false"
      />
      <ul v-else>
        <li
          v-for="(copy, index) in copies"
          :key="index"
          class="copy"
        >
          <div class="title">
            <k-router-link
              :text="copy[copy.length - 1].title"
              :to="generateCopyLink(copy[copy.length - 1].id)"
            />
          </div>
          <ol>
            <li
              v-for="(ancestor, index) in copy.slice(0, -1)"
              :key="index"
              class="ancestor"
              :class="{ 'arrow': index < copy.slice(0, -1).length - 1}"
            >
              {{ ancestor.title }}
            </li>
          </ol>
        </li>
      </ul>
    </transition>
  </k-modal>

</template>


<script>

  import { mapActions } from 'vuex';
  import kModal from 'kolibri.coreVue.components.kModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCircularLoader from 'kolibri.coreVue.components.kCircularLoader';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import sortBy from 'lodash/sortBy';
  import { PageNames } from '../constants';

  export default {
    name: 'copiesModal',
    components: {
      kModal,
      kButton,
      kCircularLoader,
      kRouterLink,
    },
    props: {
      uniqueId: {
        type: String,
        required: true,
      },
      sharedContentId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        loading: true,
        copies: [],
      };
    },
    created() {
      this.getCopies(this.sharedContentId).then(copies => {
        this.copies = sortBy(copies, copy => copy[copy.length - 1].id !== this.uniqueId);
        this.loading = false;
      });
    },
    methods: {
      ...mapActions(['getCopies']),
      closeModal() {
        return this.$emit('cancel');
      },
      generateCopyLink(id) {
        return {
          name: PageNames.TOPICS_CONTENT,
          params: { id },
        };
      },
    },
    $trs: {
      copies: 'Locations',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  .ar {
    text-align: right;
  }

  ul, ol {
    padding: 0;
  }

  ol {
    font-size: small;
  }

  .copy {
    margin-bottom: 16px;
  }

  li {
    list-style: none;
  }

  .ancestor {
    display: inline-block;
  }

  .arrow {
    &:after {
      content: '\203A';
      margin-right: 8px;
      margin-left: 8px;
    }
  }

  .title {
    margin-bottom: 4px;
  }

</style>
