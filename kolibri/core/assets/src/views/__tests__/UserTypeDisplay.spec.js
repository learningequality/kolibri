import VueRouter from 'vue-router';
import { render, screen } from '@testing-library/vue';
import UserTypeDisplay from '../UserTypeDisplay.vue';

const sampleUserType = 'testing-user-type';
const translatedSampleUserType = 'Testing User Type';

// Helper function to render the component with the provided props
const renderComponent = props => {
  const translatedUserKinds = {
    computed: {
      typeDisplayMap() {
        return {
          [sampleUserType]: translatedSampleUserType,
        };
      },
    },
  };

  return render(UserTypeDisplay, {
    routes: new VueRouter(),
    props: {
      userType: sampleUserType,
      ...props,
    },
    mixins: [translatedUserKinds],
  });
};

describe('UserTypeDisplay', () => {
  test('smoke test (renders the translated user type correctly)', () => {
    renderComponent({ userType: sampleUserType });
    expect(screen.getByText(translatedSampleUserType)).toBeInTheDocument();
  });

  test('does not render the untranslated user type', () => {
    renderComponent({ userType: sampleUserType });
    expect(screen.queryByText(sampleUserType)).not.toBeInTheDocument();
  });

  test('does not render anything if the userType prop is not provided', () => {
    const { container } = renderComponent({ userType: undefined });
    expect(container).toBeEmptyDOMElement();
  });
});
