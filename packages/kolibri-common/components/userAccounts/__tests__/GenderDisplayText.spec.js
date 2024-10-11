import { render, screen } from '@testing-library/vue';
import { FacilityUserGender } from 'kolibri/constants';
import GenderDisplayText from '../GenderDisplayText';
import '@testing-library/jest-dom';

const renderComponent = gender => {
  return render(GenderDisplayText, {
    props: {
      gender,
    },
  });
};

describe('GenderDisplayText', () => {
  const testCases = [
    {
      name: 'does not render when gender is not specified',
      gender: FacilityUserGender.NOT_SPECIFIED,
      shouldContain: [],
      shouldNotContain: ['Male', 'Female'],
    },
    {
      name: 'does not render when gender is deffered',
      gender: FacilityUserGender.DEFERRED,
      shouldContain: [],
      shouldNotContain: ['Male', 'Female'],
    },
    {
      name: 'renders when the gender is male',
      gender: FacilityUserGender.MALE,
      shouldContain: ['Male'],
      shouldNotContain: ['Female'],
    },
    {
      name: 'renders when the gender is female',
      gender: FacilityUserGender.FEMALE,
      shouldContain: ['Female'],
      shouldNotContain: ['Male'],
    },
  ];

  testCases.forEach(testCase => {
    it(testCase.name, () => {
      renderComponent(testCase.gender);

      testCase.shouldContain.forEach(text => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
      testCase.shouldNotContain.forEach(text => {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      });
    });
  });
});
