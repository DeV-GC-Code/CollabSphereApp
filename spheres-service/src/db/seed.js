import "dotenv/config";
import { pool } from "./pool.js";

// ── Resolve real user IDs from users DB ────────────────────────────────────
// Connects to the main postgres instance and looks up users by email.
// This makes the seed idempotent regardless of which order users were created.

const USER_DB_URL =
  process.env.USER_DB_URL ||
  process.env.DATABASE_URL?.replace("collabsphere_spheres", "postgres") ||
  "postgresql://postgres:postgres@localhost:5432/postgres";

async function resolveUsers() {
  const { Pool } = (await import("pg")).default;
  const userPool = new Pool({ connectionString: USER_DB_URL, max: 2 });
  const { rows } = await userPool.query(
    "SELECT id, name, email FROM users ORDER BY id",
  );
  await userPool.end();

  const byEmail = Object.fromEntries(rows.map((r) => [r.email, r]));
  const require = (email) => {
    const u = byEmail[email];
    if (!u) throw new Error(`User not found: ${email} — run the full stack first`);
    return u;
  };

  return { byEmail, require };
}

const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo  = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

async function seed() {
  console.log("[seed] Resolving users from users DB …");
  const { require } = await resolveUsers();

  // Map friendly names to resolved DB users
  const U = {
    admin:  require("admin@example.com"),
    alex:   require("alex@example.com"),
    jordan: require("jordan@example.com"),
    priya:  require("priya@example.com"),
    jim:    require("jim@example.com"),
    maria:  require("maria@example.com"),
    fatima: require("fatima@example.com"),
    chen:   require("chen@example.com"),
    taylor: require("taylor@example.com"),
    owen:   require("owen@example.com"),
  };

  console.log("[seed] Resolved users:", Object.fromEntries(Object.entries(U).map(([k, v]) => [k, v.id])));

  // ── Sphere definitions ─────────────────────────────────────────────────────
  const SPHERES = [
    {
      name:        "Platform Labs Hub",
      description: "Infrastructure, Kubernetes, cloud architecture and platform engineering.",
      tags:        ["devops", "kubernetes", "cloud", "platform"],
      banner_color: "blue",
      owner:       U.alex,
      members:     [U.jordan, U.priya, U.jim, U.maria, U.admin],
      posts: [
        {
          author: U.alex,
          title:  "Migrating to Kubernetes v1.30 — zero-downtime playbook",
          content:
            "Just shipped our ingress controller migration to k8s v1.30 with zero downtime. The biggest trap: `networking.k8s.io/v1beta1` IngressClass is gone. Every Helm chart needed an audit — we found 14 stale templates. The real win was using ArgoCD sync waves to sequence DB migrations ahead of app rollouts.\n\nKey lesson: chaos-test BEFORE you migrate. We ran a 3-broker Kafka failure scenario the week before and caught a DNS fallback loop that would have caused a 45-min prod outage.",
          score: 67, created_at: daysAgo(6),
          comments: [
            { author: U.jordan, content: "The deprecated API catch is real — we missed that on our first attempt and had a 2-hour rollback. Sync waves saved us on the second run.",             created_at: daysAgo(5) },
            { author: U.priya,  content: "Does this affect API Gateway header propagation? We rely on some custom x-forwarded headers downstream.",                                         created_at: daysAgo(4) },
            { author: U.alex,   content: "Headers are unchanged, but the default backend timeout dropped from 60 s to 30 s. Override via config map — I'll post the snippet.",             created_at: daysAgo(3) },
            { author: U.jim,    content: "This migration guide is exactly what our cloud-ops rotation needs. Sending it to the team now.",                                                  created_at: daysAgo(2) },
          ],
        },
        {
          author: U.jordan,
          title:  "ArgoCD sync-wave pattern for stateful deployments",
          content:
            "Fixed persistent out-of-sync locks in ArgoCD by adding `argocd.argoproj.io/sync-wave` annotations to every resource. Rule of thumb: DB migrations at wave -1, StatefulSets at 0, Deployments at 1. Helm chart lock errors dropped to zero after this.",
          score: 43, created_at: daysAgo(3),
          comments: [
            { author: U.jim,  content: "We had the exact same locking issue with parallel Helm deploys. Wave ordering is now part of our PR template.",     created_at: daysAgo(2) },
            { author: U.alex, content: "Solid pattern. We also pin Argo itself to a version so upgrade surprises don't break sync strategies mid-sprint.", created_at: daysAgo(1) },
          ],
        },
        {
          author: U.priya,
          title:  "Service mesh evaluation: Linkerd wins at our scale",
          content:
            "Compared Istio vs Linkerd for 180 pods. Istio control-plane overhead was ~2× Linkerd's CPU + memory. Linkerd's mTLS just works with almost no config. We'll revisit Istio for traffic-shaping features at 500+ pods, but for now simplicity wins.\n\nBenchmark numbers in comments.",
          score: 38, created_at: daysAgo(1),
          comments: [
            { author: U.chen,  content: "The control-plane overhead is what killed Istio for us too. Linkerd's binary protocol also gives noticeably lower p99 on internal calls.", created_at: hoursAgo(20) },
            { author: U.maria, content: "Would love to see the benchmark. How are you measuring — Fortio or something custom?",                                                      created_at: hoursAgo(14) },
          ],
        },
      ],
    },

    {
      name:        "Cloud Ops",
      description: "Terraform, AWS/GCP/Azure infrastructure-as-code and cloud operations.",
      tags:        ["terraform", "aws", "iac", "cloud-ops"],
      banner_color: "emerald",
      owner:       U.jim,
      members:     [U.alex, U.maria, U.fatima, U.chen, U.admin],
      posts: [
        {
          author: U.jim,
          title:  "Terraform state per environment — why monorepo workspaces burned us",
          content:
            "After 8 months on Terraform workspace monorepos: too many state-lock collisions and zero granular IAM control. Moved to one S3 bucket per environment (dev/staging/prod) with SSM Parameter Store for cross-state references. Lock contention: zero incidents since the migration.\n\nThe winning IAM pattern: bucket policy denies reads to any principal outside that env's account boundary. Devs literally cannot read staging state from local.",
          score: 72, created_at: daysAgo(7),
          comments: [
            { author: U.maria,  content: "SSM for cross-state outputs is underrated. Way cleaner than remote state data sources and the IAM story is so much simpler.",             created_at: daysAgo(6) },
            { author: U.fatima, content: "We combined this with Atlantis for PR-based apply gating. Nobody touches prod state by hand any more.",                                    created_at: daysAgo(5) },
            { author: U.chen,   content: "Added pre-plan hooks that check for drift before any apply. Catches 80% of issues before they reach the plan output.",                     created_at: daysAgo(4) },
            { author: U.jim,    content: "Drift detection hooks are next on our list — good timing Fatima. Will follow up after we ship the Atlantis PR.",                           created_at: daysAgo(3) },
          ],
        },
        {
          author: U.maria,
          title:  "Stop scraping CI/CD metrics with Prometheus — use push",
          content:
            "A 15 s Prometheus scrape interval misses GitHub Actions runners that finish in under 8 s. We're blind to 40% of our runner costs. Fix: Vector push receiver listening to GH webhook events. Within 2 days we saw 3× more accurate cost attribution and finally understood where our matrix build spend was going.",
          score: 54, created_at: daysAgo(4),
          comments: [
            { author: U.fatima, content: "This pattern fixed a $6k/month mystery charge for us. Matrix jobs were invisible to Grafana dashboards. Now they're front and centre.", created_at: daysAgo(3) },
            { author: U.jim,    content: "How are you handling the webhook auth — shared secret on the Vector side?",                                                               created_at: daysAgo(2) },
            { author: U.maria,  content: "Yes, HMAC-SHA256 verified on ingest. Vector rejects anything that doesn't match. Simple but solid.",                                     created_at: daysAgo(1) },
          ],
        },
      ],
    },

    {
      name:        "Serverless Guild",
      description: "AWS Lambda, event-driven architecture, FaaS patterns and serverless best practices.",
      tags:        ["serverless", "lambda", "aws", "event-driven"],
      banner_color: "amber",
      owner:       U.priya,
      members:     [U.jim, U.alex, U.maria, U.admin],
      posts: [
        {
          author: U.priya,
          title:  "Lambda 10 GB ephemeral storage — real production benchmark",
          content:
            "We streamed 4.2 GB zip bundles directly into /tmp instead of reading from S3 per-invocation. After 10k cold starts:\n\n• Cold start delta: +148 ms (acceptable)\n• Warm invocation: −41% vs S3 path\n• Cost: −23% fewer S3 API calls\n\nMemory allocation: 3,008 MB. Below 2,048 MB the decompression peak causes OOM on large bundles. Above 3,008 the savings don't justify the memory cost. Sweet spot.",
          score: 83, created_at: daysAgo(5),
          comments: [
            { author: U.jim,   content: "The 41% warm invocation improvement is the number that convinced our CTO. Real data from production is rare — thank you for publishing this.",  created_at: daysAgo(4) },
            { author: U.alex,  content: "What does the cold-start p99 look like? Mean is fine but tail latency is what hits SLA breaches.",                                              created_at: daysAgo(3) },
            { author: U.priya, content: "P99 cold start is +340 ms. Acceptable for our async processing use case but I wouldn't use this for a synchronous API path.",                  created_at: daysAgo(2) },
            { author: U.maria, content: "Sharing this with our serverless architecture review board. This alone changes how we size functions for batch processing.",                     created_at: daysAgo(1) },
          ],
        },
        {
          author: U.alex,
          title:  "Saga choreography for distributed transactions — no orchestrator needed",
          content:
            "Implemented saga choreography across 6 services. Each service publishes events and subscribes to what it needs. No central orchestrator = no single point of failure.\n\nThe tricky part: compensating transactions on partial failures. We use a dedicated `saga_events` table to reconstruct the transaction timeline after the fact. When something goes wrong, we replay from the last known good state.",
          score: 45, created_at: daysAgo(2),
          comments: [
            { author: U.priya, content: "Choreography over orchestration at scale is the right call. The saga_events table for post-mortem replay is clever — stealing this.", created_at: daysAgo(1) },
            { author: U.jim,   content: "How do you handle idempotency keys? That's the part that always bites teams new to choreography.",                                    created_at: hoursAgo(16) },
          ],
        },
      ],
    },

    {
      name:        "Chaos Engineering",
      description: "Chaos experiments, SRE practices, reliability testing, and building antifragile systems.",
      tags:        ["chaos", "sre", "reliability", "resilience"],
      banner_color: "rose",
      owner:       U.fatima,
      members:     [U.chen, U.owen, U.jordan, U.admin],
      posts: [
        {
          author: U.fatima,
          title:  "Data-layer chaos — the experiments nobody runs",
          content:
            "Most chaos programs stop at pod kills and network partitions. Last Tuesday we ran three simultaneously in staging: Kafka partition leadership election under load, Postgres replica lag exceeding pool timeout, and Redis eviction under memory pressure during a traffic spike.\n\nResult: exposed 2 undocumented service dependencies that would have caused a 20-minute customer-facing outage. Fixed before prod.",
          score: 91, created_at: daysAgo(6),
          comments: [
            { author: U.chen,  content: "Redis eviction under load is the chaos scenario we never ran until an on-call incident forced us to. Now it's in every sprint.",          created_at: daysAgo(5) },
            { author: U.owen,  content: "How do you isolate which failure is causing what in a simultaneous three-fault scenario? Structured logging with a chaos run ID?",        created_at: daysAgo(4) },
            { author: U.fatima,content: "Exactly — every log line carries `chaos_run_id` + `fault_type` tags. Loki queries by run ID make post-run analysis almost easy.",        created_at: daysAgo(3) },
            { author: U.jordan,content: "This is going into our runbook. We've been doing single-fault only and missing the dependency interaction failures entirely.",            created_at: daysAgo(1) },
          ],
        },
        {
          author: U.chen,
          title:  "DNS fallback loop post-mortem — recursive timeouts under load",
          content:
            "Post-mortem published for last Tuesday's routing loop. Root cause: high CPU on the API gateway caused DNS resolution to slow, which triggered the failover resolver — which was configured to loopback. The loop cost us 18 minutes.\n\nFix: explicit external resolver fallback in CoreDNS config. Added chaos experiment to our suite that artificially delays primary DNS and verifies the fallback works.",
          score: 62, created_at: daysAgo(4),
          comments: [
            { author: U.jim,    content: "The loopback misconfiguration is diabolically hard to catch without synthetic load. Adding a DNS-delay chaos test to our platform suite.", created_at: daysAgo(3) },
            { author: U.fatima, content: "Schedule a verification chaos run after you deploy the fix. Don't assume the fix works until chaos confirms it.",                            created_at: daysAgo(2) },
          ],
        },
      ],
    },

    {
      name:        "Design Systems",
      description: "UI/UX design systems, Figma workflows, accessible components, and design-engineering collaboration.",
      tags:        ["design", "figma", "accessibility", "components"],
      banner_color: "purple",
      owner:       U.taylor,
      members:     [U.alex, U.maria, U.chen, U.admin],
      posts: [
        {
          author: U.taylor,
          title:  "Every color pair in our system now passes WCAG 2.2 AAA",
          content:
            "47 color pairs were failing WCAG AA. After a systematic audit: rebuilt the dark-mode palette from scratch, added a custom Figma plugin that validates contrast on every publish, and exported everything as CSS custom properties.\n\nNo more accessibility regressions slipping through — the plugin blocks publishing if any token falls below AA. AAA is aspirational but now achievable for our primary text/surface pairs.",
          score: 58, created_at: daysAgo(5),
          comments: [
            { author: U.alex,  content: "The Figma plugin block-on-publish approach is exactly what we need. How much effort was the plugin to write?",                      created_at: daysAgo(4) },
            { author: U.maria, content: "CSS custom property export makes dev handoff trivial. Will this work with our current Storybook setup?",                           created_at: daysAgo(3) },
            { author: U.taylor,content: "Plugin took about 3 days. Yes it exports to Storybook — I'll clean it up and open-source it next sprint.",                        created_at: daysAgo(2) },
          ],
        },
        {
          author: U.alex,
          title:  "Auto-layout v5 changes everything for responsive handoffs",
          content:
            "Figma auto-layout v5 finally makes wrapping containers predictable. Our handoff process used to require a separate responsive annotation file. Now the component itself communicates all breakpoint behaviors — engineers can read the intent directly from the canvas without asking.",
          score: 35, created_at: daysAgo(2),
          comments: [
            { author: U.taylor, content: "The wrapping behavior improvements are real. We reduced design → implementation back-and-forth by about 60% on the last sprint.", created_at: daysAgo(1) },
            { author: U.chen,   content: "Finally. I used to dread responsive component handoffs. This is a genuine quality-of-life improvement for the eng side.",          created_at: hoursAgo(10) },
          ],
        },
      ],
    },

    {
      name:        "Engineering",
      description: "Software engineering fundamentals: architecture, APIs, code quality, databases and performance.",
      tags:        ["engineering", "backend", "architecture", "performance"],
      banner_color: "teal",
      owner:       U.priya,
      members:     [U.alex, U.jim, U.fatima, U.chen, U.jordan, U.admin],
      posts: [
        {
          author: U.priya,
          title:  "gRPC vs REST — 6 months of production data across 180 services",
          content:
            "After migrating the top 12 high-throughput internal APIs to gRPC:\n\n• P99 latency: −62% on serialisation-heavy routes\n• Payload size: −71% (Protobuf vs JSON)\n• Error detection: +40% via strict contract enforcement\n• Engineer ramp-up: +3 weeks average for teams new to proto\n\nThe Connect protocol was the unexpected win — gRPC-compatible but works over HTTP/1.1. Eliminated all our ALB configuration headaches with zero performance cost.",
          score: 104, created_at: daysAgo(8),
          comments: [
            { author: U.fatima, content: "The −62% P99 on serialisation-heavy routes is the number I needed to get exec sign-off on the migration. Real production data is rare.", created_at: daysAgo(7) },
            { author: U.jordan, content: "Connect protocol is the thing that finally made gRPC feasible for us. AWS ALBs don't support h2c so standard gRPC was blocked.",          created_at: daysAgo(6) },
            { author: U.alex,   content: "Six months from 180 services is the most credible benchmark I've seen outside Google. Going straight into our architecture ADR.",          created_at: daysAgo(5) },
            { author: U.chen,   content: "What's your proto versioning story? Breaking changes in proto files at scale is the part that keeps me up at night.",                       created_at: daysAgo(4) },
            { author: U.priya,  content: "Buf.build for lint and breaking-change detection. Every proto PR goes through it. No breaking changes ship without explicit discussion.",    created_at: daysAgo(3) },
          ],
        },
        {
          author: U.jordan,
          title:  "Hash sharding at 120M rows — the complete playbook",
          content:
            "Our events table hit 120M rows and single-instance Postgres was no longer viable. We went hash sharding on user_id with consistent hashing so adding shards later doesn't require full resharding.\n\nThe part nobody writes about: hot users. Power users at 500× average write volume saturate individual shards. Solution: a random shard suffix (0–3) for users above a write-rate threshold. Adds join complexity, but the balance is worth it.\n\nZero data loss, 4-hour maintenance window. Full runbook linked in comments.",
          score: 78, created_at: daysAgo(5),
          comments: [
            { author: U.priya, content: "The shard suffix for hot users is the most clearly documented solution I've seen for this specific problem. Bookmarked.",                    created_at: daysAgo(4) },
            { author: U.chen,  content: "How are you handling cross-shard analytics? That's where every beautiful sharding scheme breaks down for us.",                             created_at: daysAgo(3) },
            { author: U.jordan,content: "Dedicated read replica with materialized views per shard, pre-aggregated. 15 min lag is fine for dashboards, unacceptable for alerts.",    created_at: daysAgo(2) },
          ],
        },
        {
          author: U.chen,
          title:  "Structured logging for distributed systems — what actually works",
          content:
            "After debugging cross-service failures in a 20-service mesh, here's what matters: always include `trace_id`, `span_id`, `service_name`, and `environment` on every log line. JSON everywhere. Ship to Loki.\n\nThe insight: logs are for debugging specific incidents. Metrics are for trend analysis. Route them to separate pipelines and size them separately. Treating logs as cheap metrics is how you end up with $40k/month observability bills.",
          score: 66, created_at: daysAgo(2),
          comments: [
            { author: U.alex,   content: "Separating log and metric pipelines cut our Datadog bill by 60%. Same data, different tools, massively different cost.",           created_at: daysAgo(1) },
            { author: U.fatima, content: "The `trace_id` propagation across service boundaries is the single thing that turns 4-hour debug sessions into 10 minutes.",         created_at: hoursAgo(18) },
          ],
        },
      ],
    },
  ];

  const client = await pool.connect();
  try {
    console.log("[seed] Seeding spheres …");
    await client.query("BEGIN");

    for (const sphere of SPHERES) {
      // Create sphere
      const { rows: [s] } = await client.query(
        `INSERT INTO spheres (name, description, created_by, tags, banner_color, is_private)
         VALUES ($1, $2, $3, $4, $5, false)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [sphere.name, sphere.description, sphere.owner.id, sphere.tags, sphere.banner_color],
      );
      if (!s) { console.log(`  [skip] ${sphere.name} (already exists)`); continue; }
      const sid = s.id;

      // Owner membership
      await client.query(
        `INSERT INTO sphere_members (sphere_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
        [sid, sphere.owner.id],
      );

      // Other members
      for (const member of sphere.members) {
        await client.query(
          `INSERT INTO sphere_members (sphere_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
          [sid, member.id],
        );
      }

      // Posts + comments
      for (const post of sphere.posts) {
        const { rows: [p] } = await client.query(
          `INSERT INTO sphere_posts (sphere_id, user_id, author_name, title, content, score, comment_count, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [sid, post.author.id, post.author.name, post.title, post.content, post.score, post.comments.length, post.created_at],
        );

        for (const c of post.comments) {
          await client.query(
            `INSERT INTO sphere_post_comments (post_id, sphere_id, user_id, author_name, content, created_at)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [p.id, sid, c.author.id, c.author.name, c.content, c.created_at],
          );
        }
      }

      console.log(`  [seed] ${sphere.name} — ${sphere.posts.length} posts`);
    }

    await client.query("COMMIT");
    console.log("[seed] Done!");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error("[seed] Error:", err.message); process.exit(1); });
