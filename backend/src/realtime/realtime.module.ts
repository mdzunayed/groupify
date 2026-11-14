import { Module } from "@nestjs/common";

import { AccountsModule } from "../accounts/accounts.module";
import { DevelopmentRealtimeService } from "./development-realtime.service";

@Module({ imports: [AccountsModule], providers: [DevelopmentRealtimeService] })
export class RealtimeModule {}
