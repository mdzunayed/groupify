import { Module } from "@nestjs/common";

import { IdentityModule } from "../identity/identity.module";
import { AccountAuthorizationService } from "./account-authorization.service";
import { AccountProvisioningService } from "./account-provisioning.service";
import { AccountsController } from "./accounts.controller";

@Module({ imports: [IdentityModule], controllers: [AccountsController], providers: [AccountAuthorizationService, AccountProvisioningService], exports: [AccountAuthorizationService, AccountProvisioningService] })
export class AccountsModule {}
