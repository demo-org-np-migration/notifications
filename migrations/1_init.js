/* eslint-disable @typescript-eslint/no-var-requires */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
exports.shorthands = undefined;

// las convenciones internas de API: tablas de la base `notifications`, dueño de este repo.

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('preferences', {
    customer_id: { type: 'uuid', primaryKey: true },
    email_enabled: { type: 'boolean', notNull: true, default: true },
    push_enabled: { type: 'boolean', notNull: true, default: true },
    device_token: { type: 'text', notNull: false },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('deliveries', {
    id: { type: 'uuid', primaryKey: true },
    customer_id: { type: 'uuid', notNull: true },
    channel: { type: 'text', notNull: true },
    template: { type: 'text', notNull: true },
    provider_ref: { type: 'text', notNull: false },
    status: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('deliveries', 'customer_id');
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('deliveries');
  pgm.dropTable('preferences');
};
