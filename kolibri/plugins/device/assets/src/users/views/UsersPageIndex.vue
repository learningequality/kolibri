<template>
  <div>
    <router-view></router-view>
  </div>
</template>

<script>

  import { interpret } from 'xstate';
  import { getImportLodUsersMachine } from 'kolibri.machines.importLodUsersMachine';

  export default {
    name: 'UsersPageIndex',
    data() {
      const importLodMachine = getImportLodUsersMachine();
      return {
        service: interpret(importLodMachine),
      };
    },
    provide() {
      return {
        userImportService: this.service,
      };
    },
    created() {
      const routeNamesMap = {
        LOD_SETUP_TYPE: 'USERS',
        LOD_SELECT_FACILITY: 'SELECT_FACILITY',
        LOD_IMPORT_USER_AUTH: 'IMPORT_USER_WITH_CREDENTIALS',
        LOD_IMPORT_AS_ADMIN: 'IMPORT_USER_AS_ADMIN',
      };

      const synchronizeRouteAndMachine = state => {
        if (!state) return;

        const { meta } = state;

        // Dump out of here if there is nothing to resume from
        if (!Object.keys(meta).length) {
          this.$router.replace('/');
          return;
        }

        const route = meta[Object.keys(meta)[0]].route;
        if (route) {
          route.name = routeNamesMap[route.name] || route.name;
          // Avoid redundant navigation
          if (this.$route.name !== route.name) {
            this.$router.replace(route);
          }
        } else {
          this.$router.replace('/');
        }
      };

      this.service.start();

      this.service.onTransition(state => {
        synchronizeRouteAndMachine(state);
      });
    },
    destroyed() {
      this.service.stop();
    },
  };
</script>
