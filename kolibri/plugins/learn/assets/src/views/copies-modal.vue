<template>

  <core-modal
    :title="$tr('copies')"
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

    <div class="ar">
      <k-button
        :text="$tr('close')"
        @click="closeModal"
      />
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCircularLoader from 'kolibri.coreVue.components.kCircularLoader';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import sortBy from 'lodash/sortBy';
  import { getCopies } from '../state/actions/main';
  import { PageNames } from '../constants';

  export default {
    name: 'copiesModal',
    components: {
      coreModal,
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
    vuex: {
      actions: {
        getCopies,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .ar
    text-align: right

  ul, ol
    padding: 0

  ol
    font-size: small

  .copy
    margin-bottom: 16px

  li
    list-style: none

  .ancestor
    display: inline-block

  .arrow
    &:after
      content: '\203A'
      margin-right: 8px
      margin-left: 8px

  .title
    margin-bottom: 4px

</style>
