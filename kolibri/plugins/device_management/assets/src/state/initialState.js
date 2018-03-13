import { manageContentPageState } from './wizardState';

export default {
  pageName: '',
  pageState: {
    ...manageContentPageState(),
  },
  welcomeModalVisible: false,
};
