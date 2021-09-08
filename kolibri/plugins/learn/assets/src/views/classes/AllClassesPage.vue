<template>

  <div>
    <div v-if="isUserLoggedIn ">
      <h1>
        <KLabeledIcon icon="classes" :label="$tr('yourClassesHeader')" />
      </h1>
      <CardGrid v-if="classrooms.length > 0" :gridType="2">
        <CardLink
          v-for="c in classrooms"
          :key="c.id"
          :to="classAssignmentsLink(c.id)"
        >
          {{ c.name }}
        </CardLink>
      </CardGrid>
      <p v-else>
        {{ $tr('noClasses') }}
      </p>
    </div>

    <AuthMessage v-else authorizedRole="learner" />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CardGrid from '../cards/CardGrid.vue';
  import CardLink from '../cards/CardLink.vue';
  import { classAssignmentsLink } from './classPageLinks';

  export default {
    name: 'AllClassesPage',
    metaInfo() {
      return {
        title: this.coreString('classesLabel'),
      };
    },
    components: {
      AuthMessage,
      CardLink,
      CardGrid,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState('classes', ['classrooms']),
    },
    methods: {
      classAssignmentsLink,
    },
    $trs: {
      yourClassesHeader: {
        message: 'Your classes',
        context: 'Refers to the classes that the learner is enrolled in.',
      },
      noClasses: {
        message: 'You are not enrolled in any classes',
        context:
          'Message that a learner sees in the Learn > CLASSES section if they are not enrolled in any classes.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
