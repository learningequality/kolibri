import { render, screen } from '@testing-library/vue';
import UserTypeDisplay from '../UserTypeDisplay.vue';

const sampleUserType = 'testing-user-type';
const expectedSampleUserType = 'Testing User Type';

// Helper function to render the component with the provided props
const renderComponent = props => {
  const translatedUserKinds = {
    computed: {
      typeDisplayMap() {
        return {
          [sampleUserType]: expectedSampleUserType,
        };
      },
    },
  };

  return render(UserTypeDisplay, {
    props: {
      userType: sampleUserType,
      ...props,
    },
    mixins: [translatedUserKinds],
  });
};

describe('UserTypeDisplay', () => {
  it('smoke test (renders the translated user type correctly)', () => {
    renderComponent({ userType: sampleUserType });
    expect(screen.getByText(expectedSampleUserType)).toBeInTheDocument();
  });

  it('does not render the untranslated user type', () => {
    renderComponent({ userType: sampleUserType });
    expect(screen.queryByText(sampleUserType)).not.toBeInTheDocument();
  });

  it('does not render anything if the userType prop is not provided', () => {
    const { container } = renderComponent({ userType: undefined });
    expect(container).toBeEmptyDOMElement();
  });
});
