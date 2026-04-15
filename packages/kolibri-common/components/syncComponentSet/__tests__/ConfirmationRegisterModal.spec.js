import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import PortalResource from 'kolibri-common/apiResources/PortalResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import { ERROR_CONSTANTS } from 'kolibri/constants';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import ConfirmationRegisterModal from '../ConfirmationRegisterModal.vue';

const sampleProjectName = 'Test Project';
const sampleFacility = {
  id: 'facility-id',
  name: 'Facility Name',
  dataset: { id: 'dataset-id' },
};
const sampleToken = 'test token';

const renderComponent = props => {
  return render(ConfirmationRegisterModal, {
    props: {
      projectName: sampleProjectName,
      targetFacility: sampleFacility,
      token: sampleToken,
      ...props,
    },
  });
};

jest.mock('kolibri-common/apiResources/PortalResource', () => ({
  registerFacility: jest.fn(() => Promise.resolve()),
}));

jest.mock('kolibri-common/apiResources/FacilityDatasetResource', () => ({
  saveModel: jest.fn(() => Promise.resolve()),
}));

describe('ConfirmationRegisterModal', () => {
  it('renders with correct texts in the modal', async () => {
    renderComponent({ projectName: sampleProjectName });

    const expectedRegisterWith = ConfirmationRegisterModal.$trs.registerWith.message.replace(
      '{name}',
      sampleProjectName,
    );
    expect(screen.getByText(expectedRegisterWith)).toBeInTheDocument();
    expect(screen.getByText(ConfirmationRegisterModal.$trs.dataSaved.message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: coreString('registerAction') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: coreString('cancelAction') })).toBeInTheDocument();
  });

  it("emits the cancel event when 'Cancel' button is clicked without registering", async () => {
    const { emitted } = renderComponent();

    await fireEvent.click(screen.getByRole('button', { name: coreString('cancelAction') }));
    expect(emitted()).toHaveProperty('cancel');
    expect(emitted().cancel).toHaveLength(1);
  });

  describe("when 'Register' button is clicked to register the faculty successfully", () => {
    it('emits the success event with sample facility as argument', async () => {
      const { emitted } = renderComponent({
        projectName: sampleProjectName,
        targetFacility: sampleFacility,
      });
      await fireEvent.click(screen.getByRole('button', { name: coreString('registerAction') }));

      expect(emitted()).toHaveProperty('success');
      expect(emitted().success).toHaveLength(1);
      expect(emitted().success[0]).toEqual([sampleFacility]);
    });

    it('calls the necessary resources to register the facility', async () => {
      renderComponent({
        projectName: sampleProjectName,
        targetFacility: sampleFacility,
        token: sampleToken,
      });
      await fireEvent.click(screen.getByRole('button', { name: coreString('registerAction') }));

      expect(PortalResource.registerFacility).toHaveBeenCalledWith({
        facility_id: sampleFacility.id,
        name: sampleFacility.name,
        token: sampleToken,
      });
      expect(FacilityDatasetResource.saveModel).toHaveBeenCalledWith({
        id: sampleFacility.dataset.id,
        data: { registered: true },
        exists: true,
      });
    });
  });

  describe('when the facility is already registered with the project', () => {
    beforeEach(() => {
      PortalResource.registerFacility.mockRejectedValue({
        response: {
          data: [{ id: ERROR_CONSTANTS.ALREADY_REGISTERED_FOR_COMMUNITY }],
        },
      });
    });

    it('renders with correct text in the body of the modal', async () => {
      renderComponent({ projectName: sampleProjectName });
      await fireEvent.click(screen.getByRole('button', { name: coreString('registerAction') }));

      const expectedAlreadyReg = ConfirmationRegisterModal.$trs.alreadyRegistered.message.replace(
        '{name}',
        sampleProjectName,
      );
      await waitFor(() => expect(screen.getByText(expectedAlreadyReg)).toBeInTheDocument());
    });

    it('the buttons show the appropiate texts', async () => {
      renderComponent({ projectName: sampleProjectName });
      await fireEvent.click(screen.getByRole('button', { name: coreString('registerAction') }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: coreString('closeAction') })).toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: coreString('registerAction') }),
        ).not.toBeInTheDocument();
      });
    });

    it('emits success event with sample facility as argument when Close button is clicked if successOnAlreadyRegistered is set as true', async () => {
      const { emitted } = renderComponent({
        successOnAlreadyRegistered: true,
        targetFacility: sampleFacility,
      });
      await fireEvent.click(screen.getByRole('button', { name: coreString('registerAction') }));

      await waitFor(async () => {
        await fireEvent.click(screen.getByRole('button', { name: coreString('closeAction') }));

        expect(emitted()).toHaveProperty('success');
        expect(emitted().success).toHaveLength(1);
        expect(emitted().success[0]).toEqual([sampleFacility]);
      });
    });

    it("does not emit success event when 'Close' button is clicked if successOnAlreadyRegistered is not set", async () => {
      const { emitted } = renderComponent();
      await fireEvent.click(screen.getByRole('button', { name: coreString('registerAction') }));

      await waitFor(async () => {
        await fireEvent.click(screen.getByRole('button', { name: coreString('closeAction') }));

        expect(emitted()).not.toHaveProperty('success');
      });
    });
  });
});
