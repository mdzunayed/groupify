import { Module } from "@nestjs/common";

import { AccountsModule } from "./accounts/accounts.module";
import { HealthModule } from "./health.module";
import { HttpInfrastructureModule } from "./http/http.module";
import { IdentityModule } from "./identity/identity.module";

@Module({ imports: [HttpInfrastructureModule, HealthModule, IdentityModule, AccountsModule] })
export class AppModule {}
