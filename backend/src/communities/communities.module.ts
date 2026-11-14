import { Module } from "@nestjs/common";

import { AccountsModule } from "../accounts/accounts.module";
import { CommunityCreationService } from "./community-creation.service";
import { CommunityAuthorizationService } from "./community-authorization.service";
import { CommunitiesController } from "./communities.controller";

@Module({ imports: [AccountsModule], controllers: [CommunitiesController], providers: [CommunityCreationService, CommunityAuthorizationService], exports: [CommunityCreationService, CommunityAuthorizationService] })
export class CommunitiesModule {}
