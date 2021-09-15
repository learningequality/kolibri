import { passesRequirements } from '../browserInfo';

describe('requirements detection', () => {
  it('should pass when only major and major version is greater than or equal', () => {
    const browserName = 'test';
    const major = 1;
    const browser = {
      name: browserName,
      major,
    };
    const requirements = {
      [browserName]: {
        major,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(true);
  });
  it('should fail when only major and major version is less than', () => {
    const browserName = 'test';
    const major = 1;
    const browser = {
      name: browserName,
      major,
    };
    const requirements = {
      [browserName]: {
        major: major + 1,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
  it('should pass when major and minor, major and minor version are greater than or equal', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const browser = {
      name: browserName,
      major,
      minor,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(true);
  });
  it('should fail when major and minor and minor version is less than', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const browser = {
      name: browserName,
      major,
      minor,
    };
    const requirements = {
      [browserName]: {
        major,
        minor: minor + 1,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
  it('should fail when major and minor and minor version is undefined', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const browser = {
      name: browserName,
      major,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
  it('should pass when major/minor/patch, major/minor/patch version are greater than or equal', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const patch = 3;
    const browser = {
      name: browserName,
      major,
      minor,
      patch,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
        patch,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(true);
  });
  it('should fail when major/minor/patch, patch version is less than', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const patch = 3;
    const browser = {
      name: browserName,
      major,
      minor,
      patch,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
        patch: patch + 1,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
  it('should fail when major/minor/patch, patch version is undefined', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const patch = 3;
    const browser = {
      name: browserName,
      major,
      minor,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
        patch,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
});
