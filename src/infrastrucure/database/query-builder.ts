import * as Knex from "knex";

export interface QueryBuilder extends Knex.Knex {}

export type DatabaseClient = "pg";

export interface DatabaseConfig {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
}

export const createQueryBuilder = (
  client: DatabaseClient,
  config: DatabaseConfig
) =>
  Knex.default({
    client,
    connection: config,
  }) as QueryBuilder;
