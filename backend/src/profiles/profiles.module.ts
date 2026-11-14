import { Module } from "@nestjs/common";

import { AccountsModule } from "../accounts/accounts.module";
import { ProfilesController } from "./profiles.controller";
import { ProfileTextService } from "./profile-text.service";

@Module({ imports: [AccountsModule], controllers: [ProfilesController], providers: [ProfileTextService] })
export class ProfilesModule {}
