# Research, cost, and capacity model

All recommendations and workload models here are **Proposed** or **Assumptions requiring confirmation**. Provider prices, terms, country coverage, capacity and the supported-device matrix must be checked again before a commitment. No provider, subscription price, rider limit, GPS threshold, or numerical capacity target is approved here.

## Existing evidence and source conflict

- **Approved decision:** Initial infrastructure planning allowance is ৳2,000–৳3,000 per month, not a quoted total or guaranteed service level.
- **Repository observation:** The checked-in manifest currently resolves Expo 58.0.23, React Native 0.88.1 and `@expo/ui` 58.0.27 in the existing local installation. `expo install --check` passed during Phase 1; this is local compatibility evidence, not approval of exact release versions or proof of device behavior.
- **Approved decision:** The owner confirmed the [Groupify Development Master Plan](https://docs.google.com/document/d/1ngIhr3lzCA0Tstr1SZY4HcmcKkEp8T3ylyTEqX1PwwQ) baseline of approximately 100–500 users for planning. This is not a concurrency target, membership limit, measured capacity, or service guarantee.
- **Approved decision:** Background/screen-off GPS is required subject to Android constraints, and detailed-location retention is 30 days subject to legally required retention. Applicable obligations and implementation remain open; the exception does not establish a blanket extension.

## Cost components

| Component | Variables and operational considerations | Evidence / current unknowns |
| --- | --- | --- |
| Backend hosting | Compute, memory, persistent disk, outbound bandwidth, operating-system maintenance, staging, redundancy and provider region. A single VM concentrates failure and operational work; managed services may shift work into recurring charges. | Compare [DigitalOcean Droplets](https://www.digitalocean.com/pricing/droplets), [DigitalOcean backups](https://docs.digitalocean.com/products/backups/details/pricing/) and [Render pricing](https://render.com/pricing/). Size and actual bill are unvalidated. |
| Data and recovery | PostgreSQL/PostGIS, Redis, storage growth, backups, restore testing, backup egress and deletion handling. | Self-managed vs managed and backup policy are open; a compute-only quote is incomplete. |
| OTP | Billable attempts, country/carrier rates, retries, abuse, vendor minimums and tax. Auth vendor and SMS delivery supplier may be different. | Compare [Clerk](https://clerk.com/pricing), [Firebase pricing](https://firebase.google.com/pricing/) and [Twilio Verify](https://www.twilio.com/en-us/verify/pricing). Bangladesh route availability, registration, per-message quotes and delivery must be verified. |
| Maps and routing | Tile loads, geocoding, route queries, caching permissions, attribution, offline use, provider tiers, traffic and taxes. | [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) and [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) limit public-service use; compare [MapTiler pricing](https://www.maptiler.com/cloud/pricing/) and actual routing/geocoding terms. |
| PTT | Participant-minutes, media bitrate, relay/TURN bandwidth, SFU CPU, egress, signaling and managed vs self-hosted operations. | Compare [LiveKit's Expo integration](https://docs.livekit.io/transport/sdk-platforms/expo/) with self-hosted WebRTC and other managed audio; obtain quotes and measure real devices. |
| Push, monitoring and release | Notification volume, logs/retention, crash monitoring, build minutes, signing/distribution and support operations. | FCM is the approved direction; exact delivery, monitoring, build and operational costs remain unvalidated. |

### Published price observations

These are sourced list prices observed during research, **not invented Groupify prices, approved purchases, production quotes, capacity recommendations, or a forecast**. Plans, eligibility, regions and rates can change; recheck them before any commitment.

| Example | Published observation and limitation |
| --- | --- |
| DigitalOcean compute and basic backup | The [Droplet list](https://www.digitalocean.com/pricing/droplets) shows a 1 GiB basic VM at US$6/month; [basic weekly backups](https://docs.digitalocean.com/products/backups/details/pricing/) add 20% of the VM cost. This does not establish that the VM is adequately sized or available in the desired region. |
| MapTiler | The [pricing page](https://www.maptiler.com/cloud/pricing/) lists Flex at US$30/month plus extra usage and excludes VAT. It describes the free tier as suitable for testing, prototypes, personal or non-commercial use; confirm the actual commercial terms before relying on it. |
| LiveKit Cloud | The [pricing page](https://livekit.com/pricing) lists a US$0 Build plan and a Ship plan starting at US$50/month described for real users. Confirm current media limits, production eligibility and actual usage charges; the plan label alone does not establish which plan Groupify needs. |
| Twilio Verify | Its [published pricing](https://www.twilio.com/en-us/verify/pricing) lists US$0.05 per successful verification plus channel fees; unsuccessful attempts can still incur delivery charges. The Bangladesh-specific SMS rate and route have not been verified. |
| Clerk SMS | [Clerk's pricing](https://clerk.com/pricing) describes international SMS as market rate. Obtain a Bangladesh-specific quote and confirm the identity and SMS delivery arrangement. |

For a **conditional illustration only**, combining that 1 GiB VM with weekly basic backup, MapTiler Flex and LiveKit Ship yields US$87.20/month before SMS, traffic overages, tax, exchange-rate fees, staging, data/backup extras and operations. At the [Bangladesh Bank reference rate](https://www.bb.org.bd/en/index.php?Itemid=124&id=106&option=com_content&view=article) of ৳124.6021 per US dollar published for 11 November 2026, that is approximately ৳10,865/month, or 3.6–5.4 times the approved ৳2,000–৳3,000 allowance. The reference rate is not a card or bank transaction quote. This is neither a recommendation to buy those tiers nor proof they are suitable or required; it shows why those specific combined list prices warrant a budget review.

**Proposed budget calculation:** monthly total = compute + databases/cache + storage/backups + OTP + map/routing/geocoding + media/TURN + outbound transfer + monitoring/builds + taxes/fees + operational costs. Use provider-specific billing units, valid Bangladesh SMS quotes and a current exchange rate when approved inputs exist. Report uncertainty and peak usage; do not claim the allowance is sufficient without quotes and measurements.

## Capacity variables and load-test design

Let `R` be concurrent active rides, `n_i` the number of active riders in ride `i`, `f_i` the observed location updates per rider per unit time, `b` the measured serialized update size, and `L_i` the number of authorized receivers. Proposed first-order workload estimates are:

- Location ingress: `sum(n_i * f_i * b)`; live delivery before batching/compression: `sum(n_i * f_i * L_i * b)`. `L_i` is governed by the eventually approved visibility policy, not assumed equal to membership.
- PTT delivery: measured speaking time × authorized listeners × encoded bitrate, plus signaling, SFU processing, retransmission and possible TURN relay traffic. A single-speaker rule is per ride, not a global system capacity.
- Offline reconnect: measure queued records per device, concurrent reconnects, duplicate retries and database write load; a successful local enqueue is not a server commit.
- Storage and retention: measured accepted point volume × retention behavior, plus indexes, backups and legal/deletion constraints; exact retention clock and deletion implementation remain open.

Choose realistic scenarios only after the owner confirms population, active-rider concurrency, ride/community sizes, network conditions, geographic distribution, GPS policy and availability objective. Test low/connectivity loss and reconnect bursts as well as steady load. Do not infer maximum membership, service-level objectives or costs from the historical planning population.

## Source and feasibility notes

- [Expo SDK 58 location](https://docs.expo.dev/versions/v58.0.0/sdk/location/) documents background permission/configuration constraints; [Android background location](https://developer.android.com/develop/sensors-and-location/location/background) describes platform limits.
- [Android foreground-service types](https://developer.android.com/develop/background-work/services/fgs/service-types) impose microphone/location restrictions that vary with platform and app state. Background or locked-screen PTT remains an unverified product risk.
- [MapLibre React Native Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/) and [LiveKit Expo setup](https://docs.livekit.io/transport/sdk-platforms/expo/) require native development builds rather than Expo Go. Neither source establishes compatibility with this project's exact versions or approves those candidates.
- [WebRTC TURN guidance](https://webrtc.org/getting-started/turn-server) explains why relay infrastructure can be necessary; connectivity and relay usage must be measured.
- [Google Play Billing backend guidance](https://developer.android.com/google/play/billing/backend) supports server-side verification; policy, payment availability in the target market and fee implications require current review.

The [decision records](architecture-decisions/README.md) compare alternatives, costs, reversibility, and approvals for each research topic.
