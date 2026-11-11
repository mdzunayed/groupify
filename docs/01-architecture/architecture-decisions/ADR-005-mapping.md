# ADR-005: Maps, routing, and geocoding

**Status: Proposed.** An OpenStreetMap-based ecosystem is approved; individual providers are open.

**Options considered:** MapLibre React Native with licensed MapTiler tiles and a separately selected routing/geocoding service; a commercial integrated provider such as Mapbox; self-hosted OSM-derived tiles, routing and geocoding.

**Recommendation and reasoning:** Evaluate MapLibre as a renderer, licensed MapTiler as a tile candidate and openrouteservice as a routing/geocoding candidate, with independent verification of Bangladesh coverage, licensing, quotas, attribution, allowed caching and offline terms. Renderer, map data, tile service, routing and geocoding are distinct choices and can be replaced separately.

**Trade-offs and cost/operations:** Managed tiles and routing reduce server operations but add usage fees and terms; self-hosting gives control but adds data refresh, disk, operational and bandwidth costs. MapTiler's published Flex price is US$30/month before extras/VAT, and its free tier is described for testing or personal/non-commercial use; eligibility and current terms must be verified. Public OSM tile and Nominatim services are not an unlimited production backend. MapLibre requires a native build and compatibility testing in this Expo project.

**Reversibility:** Provider adapters and OSM attribution separation ease changes; cached content, styles, route formats, terms and data portability may require migration.

**Approval required:** Renderer and each service, data/license terms, offline behavior, costs and suitable Bangladesh coverage. No public service use or provider purchase is authorized by this proposal.

**Evidence:** [MapLibre Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/), [OSM attribution](https://www.openstreetmap.org/copyright), [MapTiler pricing](https://www.maptiler.com/cloud/pricing/), [openrouteservice](https://openrouteservice.org/).
