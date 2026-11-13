import { Module } from "@nestjs/common";

import { DevelopmentIdentityService } from "./development-identity.service";

@Module({ providers: [DevelopmentIdentityService], exports: [DevelopmentIdentityService] })
export class IdentityModule {}
