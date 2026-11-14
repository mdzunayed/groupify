import { Module } from "@nestjs/common";

import { IdentityModule } from "../identity/identity.module";
import { AccountAuthorizationService } from "./account-authorization.service";

@Module({ imports: [IdentityModule], providers: [AccountAuthorizationService], exports: [AccountAuthorizationService] })
export class AccountsModule {}
