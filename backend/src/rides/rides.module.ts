import { Module } from "@nestjs/common";

import { CommunitiesModule } from "../communities/communities.module";
import { RideCreationService } from "./ride-creation.service";

@Module({ imports: [CommunitiesModule], providers: [RideCreationService], exports: [RideCreationService] })
export class RidesModule {}
