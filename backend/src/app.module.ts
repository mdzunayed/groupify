import { Module } from "@nestjs/common";

import { AccountsModule } from "./accounts/accounts.module";
import { CommunitiesModule } from "./communities/communities.module";
import { HealthModule } from "./health.module";
import { HttpInfrastructureModule } from "./http/http.module";
import { IdentityModule } from "./identity/identity.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { RidesModule } from "./rides/rides.module";

@Module({ imports: [HttpInfrastructureModule, HealthModule, IdentityModule, AccountsModule, CommunitiesModule, RealtimeModule, ProfilesModule, RidesModule] })
export class AppModule {}
