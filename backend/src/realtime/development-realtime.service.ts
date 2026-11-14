import { HttpException, Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import { STATUS_CODES, type IncomingMessage, type Server } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer, type RawData } from "ws";

import { AccountAuthorizationService } from "../accounts/account-authorization.service";
import { httpErrorBody } from "../http/http-error.filter";
import { requestIdFor } from "../http/request-id";

@Injectable()
export class DevelopmentRealtimeService implements OnModuleInit, OnModuleDestroy {
  private server?: WebSocketServer;
  private httpServer?: Server;
  private readonly pending = new Set<Duplex>();
  private stopping = false;
  private readonly onUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    socket.on("error", () => socket.destroy());
    this.pending.add(socket);
    socket.once("close", () => this.pending.delete(socket));
    void this.upgrade(request, socket, head).catch(() => this.reject(request, socket, 503));
  };

  constructor(private readonly adapterHost: HttpAdapterHost, private readonly accounts: AccountAuthorizationService) {}

  onModuleInit() {
    if (process.env.GROUPIFY_DEV_WS_ENABLED !== "true" || !["development", "test"].includes(process.env.NODE_ENV ?? "")) return;
    const server = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
    server.on("error", () => undefined);
    server.on("wsClientError", (_error, socket, request) => this.reject(request, socket, 400));
    server.on("headers", (headers, request) => {
      headers.push(`X-Request-Id: ${requestIdFor(request)}`, "Cache-Control: no-store");
    });
    this.server = server;
    this.httpServer = this.adapterHost.httpAdapter.getHttpServer() as Server;
    this.httpServer.on("upgrade", this.onUpgrade);
  }

  private async upgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
    if (this.stopping || !this.server) { this.reject(request, socket, 503); return; }
    // Credentials belong only in the Authorization header. Do not accept URL,
    // cookie or subprotocol tokens, and never reflect request material.
    if (request.url !== "/v1/development/events") { this.reject(request, socket, 404); return; }
    if (request.headers["sec-websocket-protocol"] !== undefined) { this.reject(request, socket, 400); return; }
    const authorization = request.headers.authorization;
    try {
      await this.accounts.withActiveAccount(authorization, async () => undefined);
    } catch (error) {
      this.reject(request, socket, this.authStatus(error));
      return;
    }
    if (this.stopping || socket.destroyed) { socket.destroy(); return; }
    this.server.handleUpgrade(request, socket, head, (peer) => {
      this.pending.delete(socket);
      peer.on("error", () => undefined);
      let busy = false;
      peer.on("message", (data: RawData, binary: boolean) => {
        if (busy) { peer.close(1008, "Request already in progress"); return; }
        busy = true;
        void this.message(peer, authorization, data, binary).catch(() => peer.terminate()).finally(() => { busy = false; });
      });
      peer.once("close", () => peer.removeAllListeners("message"));
      this.send(peer, "connected", requestIdFor(request));
    });
  }

  private async message(peer: WebSocket, authorization: unknown, data: RawData, binary: boolean) {
    if (binary) { peer.close(1003, "Text requests are required"); return; }
    let message: unknown;
    try { message = JSON.parse(data.toString()); }
    catch { peer.close(1007, "Invalid request"); return; }
    if (!message || typeof message !== "object" || Array.isArray(message) || Object.keys(message).length !== 1 ||
        !("event" in message) || message.event !== "check_account") {
      peer.close(1008, "Unsupported request");
      return;
    }
    try {
      // Connection establishment is not an ongoing authorization cache. Future
      // product messages must also check their own resource/participant/consent.
      await this.accounts.withActiveAccount(authorization, async () => undefined);
      this.send(peer, "account_checked", randomUUID());
    } catch (error) {
      const status = this.authStatus(error);
      peer.close(status === 503 ? 1013 : 1008, status === 503 ? "Service unavailable" : "Access denied");
    }
  }

  private send(peer: WebSocket, event: string, requestId: string) {
    if (peer.readyState === WebSocket.OPEN) {
      peer.send(JSON.stringify({ event, requestId, data: { status: "ok" } }), (error) => { if (error) peer.terminate(); });
    }
  }

  private authStatus(error: unknown): number {
    const status = error instanceof HttpException ? error.getStatus() : 503;
    return status === 401 || status === 403 ? status : 503;
  }

  private reject(request: IncomingMessage, socket: Duplex, status: number) {
    if (socket.destroyed) return;
    const requestId = requestIdFor(request);
    const body = JSON.stringify(httpErrorBody(status, requestId));
    socket.end(`HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\nContent-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nX-Request-Id: ${requestId}\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`, () => socket.destroy());
  }

  async onModuleDestroy() {
    this.stopping = true;
    this.httpServer?.off("upgrade", this.onUpgrade);
    for (const socket of this.pending) socket.destroy();
    if (this.server) {
      for (const peer of this.server.clients) peer.terminate();
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    }
  }
}
