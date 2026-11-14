import { Module } from "@nestjs/common";

import { CommunitiesModule } from "../communities/communities.module";
import { RideCreationService } from "./ride-creation.service";
import { RideLifecycleService } from "./ride-lifecycle.service";
import { RidesController } from "./rides.controller";

@Module({ imports: [CommunitiesModule], controllers: [RidesController], providers: [RideCreationService, RideLifecycleService], exports: [RideCreationService, RideLifecycleService] })
export class RidesModule {}
