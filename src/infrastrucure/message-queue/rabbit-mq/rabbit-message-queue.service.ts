import { DomainSubscriber, Logger, NotFoundError } from "../../..";
import { MessageQueueService } from "../message-queue.service";
import rascal from "rascal";

interface Dependencies {
  rascalBroker: rascal.BrokerAsPromised;
  logger: Logger;
  subscribers: DomainSubscriber<any>[];
}

export class RabbitMessageQueueServiceImpl implements MessageQueueService {
  constructor(private readonly dependencies: Dependencies) {}

  public async produceMessage<PayloadType extends object>(
    queueName: string,
    payload: PayloadType
  ) {
    const { rascalBroker, logger } = this.dependencies;

    const msg = JSON.stringify(payload);

    const publication = await rascalBroker.publish(queueName, msg);

    publication.on("error", (error, messageId) => {
      logger.error(`Publication error for id: ${messageId}.`, error);

      throw new Error(`Publication error for message: "${messageId}"`);
    });
  }

  public async consumeMessage(queueName: string) {
    const { rascalBroker, logger } = this.dependencies;

    const existingSubscriber = this.dependencies.subscribers.find(
      (subscriber) => subscriber.name === queueName
    );

    if (!existingSubscriber) {
      throw new NotFoundError(
        `Subscriber for queue: "${queueName}" does not exist.`
      );
    }

    const subscription = await rascalBroker.subscribe(queueName);

    subscription
      .on("message", async (message, content, ackOrNack) => {
        logger.info(
          `[Message Queue] Handling message for: "${message.fields.exchange}.${message.fields.routingKey}".`
        );

        await existingSubscriber.handle(JSON.parse(content.toString()));

        ackOrNack();
      })
      .on("error", async (error) => {
        logger.error("Error on message queue subscriber.", error);
      });
  }
}
