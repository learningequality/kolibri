module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    testResultsProcessor: "jest-teamcity-reporter", // REVIEW: needs comment: what happens when not on TC?
    testMatch: [
         "**/?(*.)(spec|test).ts?(x)"
    ]
};
