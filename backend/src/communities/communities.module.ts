import { Module } from "@nestjs/common";

import { AccountsModule } from "../accounts/accounts.module";
import { CommunityCreationService } from "./community-creation.service";
import { CommunityAuthorizationService } from "./community-authorization.service";

@Module({ imports: [AccountsModule], providers: [CommunityCreationService, CommunityAuthorizationService], exports: [CommunityCreationService, CommunityAuthorizationService] })
export class CommunitiesModule {}
