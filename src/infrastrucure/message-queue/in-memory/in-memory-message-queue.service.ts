/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import { AggregateRoot, DomainEventStatusValue, logger } from "../../..";
import { DatabaseTransaction } from "../../database/database-transaction";

export class DomainEvents {
  private static handlersMap = new Map<string, Function[]>();

  private static markedAggregatesMap = new Map<
    string,
    AggregateRoot<unknown>
  >();

  public static markAggregateForDispatch(aggregate: AggregateRoot<unknown>) {
    const key = this.getAggregateKey(aggregate);

    if (!this.markedAggregatesMap.has(key)) {
      this.markedAggregatesMap.set(key, aggregate);
    }
  }

  public static async dispatchDomainEventsForAggregate(
    aggregate: AggregateRoot<unknown>,
    trx?: DatabaseTransaction
  ) {
    const key = this.getAggregateKey(aggregate);

    if (!this.markedAggregatesMap.has(key)) {
      return;
    }

    aggregate.clearDomainEvents();

    this.markedAggregatesMap.delete(key);
  }

  public static register(
    callback: (payload: any, trx: DatabaseTransaction) => void,
    eventName: string
  ) {
    if (!this.handlersMap.has(eventName)) {
      this.handlersMap.set(eventName, []);
    }

    this.handlersMap.set(eventName, [
      ...this.handlersMap.get(eventName)!,
      callback,
    ]);
  }

  public static clearHandlers() {
    this.handlersMap.clear();
  }

  public static clearMarkedAggregates() {
    this.markedAggregatesMap.clear();
  }

  private static async dispatch(
    persistedEventId: string,
    eventName: string,
    payload: object,
    trx?: DatabaseTransaction
  ) {
    if (this.handlersMap.has(eventName)) {
      const handlers = this.handlersMap.get(eventName);

      for (const handler of handlers!) {
        try {
          logger.info(`[Domain Events]: Handling event "${eventName}"`);
          await handler(payload, trx);
        } catch (error) {
          logger.error(
            `[Domain Events]: Subscriber error occured on event: ${eventName} inside ${handler.name}`
          );
          logger.error(error.toString());

          throw error;
        }
      }
    }
  }

  private static getAggregateKey(aggregate: AggregateRoot<unknown>) {
    return `${aggregate.getId().getValue()}_${aggregate.constructor.name}`;
  }
}
