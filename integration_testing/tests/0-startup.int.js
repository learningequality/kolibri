const { percySnapshot } = require('../helpers/percy');

describe('Kolibri setup wizard', () => {
  beforeAll(() => {
    browser.url('/');
  });

  const totalSteps = 7;
  const stepTitle = stepName => `${stepName} of ${totalSteps}`;
  const assertStepTitle = stepName => {
    expect($('.ui-toolbar .ui-toolbar__body').getText()).toEqual(stepTitle(stepName));
  };
  const assertH1 = expected => {
    expect($('h1').getText()).toEqual(expected);
  };
  const waitForNextStep = currentStepName => {
    browser.waitUntil(() => {
      return $('.ui-toolbar .ui-toolbar__body').getText() !== stepTitle(currentStepName);
    });
  };

  describe('Step 1', function() {
    const stepName = this.description;

    it('should name step in app top bar', () => {
      assertStepTitle(stepName);
      percySnapshot(['Setup Wizard', stepName]);
    });

    it('should render language chooser', () => {
      assertH1('Please select the default language for Kolibri');
    });

    it('should set the language', () => {
      $('[type=submit]').click();

      waitForNextStep(stepName);
    });
  });

  describe('Step 2', function() {
    const stepName = this.description;

    it('should name step in app top bar', () => {
      assertStepTitle(stepName);

      percySnapshot(['Setup Wizard', stepName]);
    });

    it('should render facility configurator', () => {
      assertH1('What kind of facility are you installing Kolibri in?');
    });

    it('should set facility type', () => {
      $('[type=radio][value=informal] + svg').click();
      $('[type=submit]').click();

      waitForNextStep(stepName);
    });
  });

  describe('Step 3', function() {
    const stepName = this.description;

    it('should name step in app top bar', () => {
      assertStepTitle(stepName);

      percySnapshot(['Setup Wizard', stepName]);
    });

    it('should ask about guest access', () => {
      assertH1('Enable guest access?');
    });

    it('should allow guest access by default', () => {
      expect($('[type=radio][value=true]').isSelected()).toBeTruthy();
      $('[type=submit]').click();

      waitForNextStep(stepName);
    });
  });

  describe('Step 4', function() {
    const stepName = this.description;

    it('should name step in app top bar', () => {
      assertStepTitle(stepName);

      percySnapshot(['Setup Wizard', stepName]);
    });

    it('should ask about learner registration', () => {
      assertH1('Allow anyone to create their own learner account?');
    });

    it('should allow learners to self-register', () => {
      expect($('[type=radio][value=true]').isSelected()).toBeTruthy();
      $('[type=submit]').click();

      waitForNextStep(stepName);
    });
  });

  describe('Step 5', function() {
    const stepName = this.description;

    it('should name step in app top bar', () => {
      assertStepTitle(stepName);

      percySnapshot(['Setup Wizard', stepName]);
    });

    it('should ask about passwords', () => {
      assertH1('Enable passwords on learner accounts?');
    });

    it('should enforce passwords by default', () => {
      expect($('[type=radio][value=true]').isSelected()).toBeTruthy();
      $('[type=submit]').click();

      waitForNextStep(stepName);
    });
  });

  describe('Step 6', function() {
    const stepName = this.description;

    it('should name step in app top bar', () => {
      assertStepTitle(stepName);

      percySnapshot(['Setup Wizard', stepName]);
    });

    it('should ask for super admin details', () => {
      assertH1('Create super admin account');
    });

    it('should add the super admin', () => {
      $('input[type=text][autocomplete=name]').setValue('Super Admin');
      $('input[type=username][autocomplete=username]').setValue('admin');
      $$('input[type=password][autocomplete=new-password]').forEach(input =>
        input.setValue('tester')
      );

      $('[type=submit]').click();
      waitForNextStep(stepName);
    });
  });

  describe('Step 7', function() {
    const stepName = this.description;

    it('should name step in app top bar', () => {
      assertStepTitle(stepName);

      percySnapshot(['Setup Wizard', stepName]);
    });

    it('should mention the great power of administration', () => {
      assertH1('Responsibilities as an administrator');
    });

    it('should complete setup', () => {
      $('[type=submit]').click();
      waitForNextStep(stepName);

      assertH1('Welcome to Kolibri!');
    });
  });
});
