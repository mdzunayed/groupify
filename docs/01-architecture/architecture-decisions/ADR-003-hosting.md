# ADR-003: Hosting and deployment

**Status: Proposed.** No cloud resources are provisioned.

**Options considered:** A self-managed virtual machine such as a DigitalOcean Droplet; managed application/database services such as Render; a larger multi-service or highly available deployment.

**Recommendation and reasoning:** Cost and operationally evaluate a small self-managed VM with separately planned backups and a distinct non-production environment as the first comparison baseline; compare it against a managed service before choosing. Keep audio/media hosting separate in the model, since a backend VM quote does not cover an SFU, TURN traffic, maps or SMS. Deployment topology is unapproved and must not be inferred from the term modular monolith.

**Trade-offs and cost/operations:** A VM may reduce visible platform charges but requires patching, monitoring, restore drills, security, disk sizing and incident response; it is a single point of failure. Managed databases or services can reduce some operations but add recurring charges and provider constraints. No estimate yet proves feasibility within the approved ৳2,000–৳3,000 monthly planning allowance.

**Reversibility:** Containers, documented backup/restore and externalized configuration can ease provider changes; IPs, data migration, downtime, regional placement and operational skills still create switching costs.

**Approval required:** Provider, region, topology, budget estimate, environments, backups, availability needs and credentials practices before provisioning.

**Evidence:** [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets), [DigitalOcean backup pricing](https://docs.digitalocean.com/products/backups/details/pricing/), [Render pricing](https://render.com/pricing/), [cost model](../research-cost-capacity.md).
