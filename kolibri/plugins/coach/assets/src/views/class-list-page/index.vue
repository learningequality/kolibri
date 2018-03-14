<template>

  <div>

    <h1>{{ $tr('myClasses') }}</h1>
    <p>{{ $tr('pageDescription') }}</p>

    <div class="table-wrapper" v-if="!noClassesExist">
      <core-table>
        <caption class="visuallyhidden">{{ $tr('tableCaption') }}</caption>
        <thead slot="thead">
          <tr>
            <th class="core-table-icon-col"></th>
            <th class="core-table-main-col">{{ $tr('className') }}</th>
            <th>{{ $tr('members') }}</th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="cl in sortedClasses" :key="cl.id">
            <td class="core-table-icon-col">
              <content-icon :kind="CLASSROOM" />
            </td>
            <th scope="row" class="core-table-main-col">
              <k-router-link
                :text="cl.name"
                :to="learnerPageLink(cl.id)"
              />
            </th>
            <td>{{ cl.memberCount }}</td>
          </tr>
        </tbody>
      </core-table>
    </div>

    <p v-else>{{ $tr('noClassesExist') }}</p>

  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import ContentIcon from 'kolibri.coreVue.components.contentIcon';
  import { PageNames } from '../../constants';
  import orderBy from 'lodash/orderBy';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  export default {
    name: 'coachClassListPage',
    components: {
      CoreTable,
      ContentIcon,
      kRouterLink,
    },
    computed: {
      CLASSROOM: () => ContentNodeKinds.CLASSROOM,
      sortedClasses() {
        return orderBy(this.classes, [classroom => classroom.name.toUpperCase()], ['asc']);
      },
      noClassesExist() {
        return this.sortedClasses ? this.sortedClasses.length === 0 : false;
      },
    },
    methods: {
      learnerPageLink(id) {
        return {
          name: PageNames.LEARNER_LIST,
          params: { classId: id },
        };
      },
    },
    vuex: {
      getters: {
        classes: state => state.classList,
      },
    },
    $trs: {
      myClasses: 'All classes',
      pageDescription: 'View learner progress and performance',
      className: 'Class name',
      tableCaption: 'List of classes',
      members: 'Members',
      noClassesExist: 'No classes exist',
    },
  };

</script>


<style lang="stylus" scoped></style>
