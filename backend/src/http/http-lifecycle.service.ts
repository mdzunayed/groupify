import { Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";

@Injectable()
export class HttpLifecycleService implements OnApplicationShutdown {
  private readonly logger = new Logger(HttpLifecycleService.name);

  // Nest invokes this after HTTP disposal, not when a signal first arrives.
  onApplicationShutdown(signal?: string) {
    this.logger.log({
      event: "http_shutdown_complete",
      signal: signal === "SIGTERM" || signal === "SIGINT" ? signal : "manual",
    });
  }
}
