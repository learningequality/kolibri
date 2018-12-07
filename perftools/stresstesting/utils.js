/**
 * Created by aron on 7/21/17.
 */

const Faker = require('faker');

function generateRandomUserData(userContext, events, done) {
  userContext.vars.fullname = `${Faker.name.firstName()} ${Faker.name.lastName()}`;
  userContext.vars.username = Faker.internet.userName().replace('.', '');
  userContext.vars.password = Faker.internet.password();

  return done();
}

module.exports = {
  generateRandomUserData,
};
