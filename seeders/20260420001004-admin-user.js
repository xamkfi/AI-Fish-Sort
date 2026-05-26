'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await queryInterface.bulkInsert('Admins', [{
      id: 'aaaaaaaa-1111-4111-8111-aaaaaaaa1111',
      username: 'admin',
      passwordHash,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {
      updateOnDuplicate: ['username', 'passwordHash', 'role', 'updatedAt']
    });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Admins', { username: 'admin' });
  }
};
