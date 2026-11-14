import { Module } from "@nestjs/common";

import { CommunitiesModule } from "../communities/communities.module";
import { RideCreationService } from "./ride-creation.service";
import { RideLifecycleService } from "./ride-lifecycle.service";

@Module({ imports: [CommunitiesModule], providers: [RideCreationService, RideLifecycleService], exports: [RideCreationService, RideLifecycleService] })
export class RidesModule {}
