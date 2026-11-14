import "reflect-metadata";

import { ConsoleLogger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

const logger = new ConsoleLogger({ json: true });

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    logger.error({ event: "startup_failed", reason: "invalid_port" });
    process.exitCode = 1;
    return;
  }
  const app = await NestFactory.create(AppModule, {
    logger,
    abortOnError: false,
  });
  try {
    app.enableShutdownHooks();
    await app.listen(port, process.env.HOST ?? "127.0.0.1");
  } catch (error) {
    await app.close();
    throw error;
  }
}

void bootstrap().catch(() => {
  logger.error({ event: "startup_failed", reason: "bootstrap_error" });
  process.exitCode = 1;
});
