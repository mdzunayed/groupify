import { Module } from "@nestjs/common";

import { AccountsModule } from "../accounts/accounts.module";
import { CommunityCreationService } from "./community-creation.service";

@Module({ imports: [AccountsModule], providers: [CommunityCreationService], exports: [CommunityCreationService] })
export class CommunitiesModule {}
