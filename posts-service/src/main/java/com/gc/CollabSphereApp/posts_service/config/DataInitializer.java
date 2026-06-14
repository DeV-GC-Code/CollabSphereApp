package com.gc.CollabSphereApp.posts_service.config;

import com.gc.CollabSphereApp.posts_service.entity.Post;
import com.gc.CollabSphereApp.posts_service.entity.PostComment;
import com.gc.CollabSphereApp.posts_service.repository.PostCommentRepository;
import com.gc.CollabSphereApp.posts_service.repository.PostsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final PostsRepository postsRepository;
    private final PostCommentRepository postCommentRepository;

    // ARC-3: the `users` table now lives in collabsphere_users (DB-per-service), not in
    // this service's posts DB. Resolve seed authors via a dedicated read-only lookup so we
    // don't re-couple the two schemas.
    @Value("${users.datasource.url}")
    private String usersDbUrl;
    @Value("${spring.datasource.username}")
    private String dbUsername;
    @Value("${spring.datasource.password}")
    private String dbPassword;

    private JdbcTemplate usersJdbcTemplate;

    private JdbcTemplate usersJdbcTemplate() {
        if (usersJdbcTemplate == null) {
            DriverManagerDataSource ds = new DriverManagerDataSource(usersDbUrl, dbUsername, dbPassword);
            ds.setDriverClassName("org.postgresql.Driver");
            usersJdbcTemplate = new JdbcTemplate(ds);
        }
        return usersJdbcTemplate;
    }

    private static final String IMG = "\n\n[media:{\"type\":\"image\",\"data\":\"%s\"}]";

    private record SeedPost(long userId, String content, List<SeedComment> comments) {}
    private record SeedComment(long userId, String content) {}

    /** Look up a user's DB id by email in collabsphere_users. Returns null when not present yet. */
    private Long uid(String email) {
        try {
            return usersJdbcTemplate().queryForObject(
                    "SELECT id FROM users WHERE email = ?", Long.class, email);
        } catch (Exception e) {
            return null;
        }
    }

    /** Resolve all required emails to IDs, retrying up to 5 × 2 s while users aren't seeded. */
    private Map<String, Long> resolveUsers() throws InterruptedException {
        String[] emails = {
            "admin@example.com", "alex@example.com", "jordan@example.com",
            "priya@example.com", "jim@example.com",  "maria@example.com",
            "fatima@example.com","chen@example.com",  "taylor@example.com",
            "owen@example.com"
        };
        for (int attempt = 0; attempt < 5; attempt++) {
            Map<String, Long> ids = new java.util.HashMap<>();
            boolean allFound = true;
            for (String email : emails) {
                Long id = uid(email);
                if (id == null) { allFound = false; break; }
                ids.put(email, id);
            }
            if (allFound) return ids;
            log.info("[DataInitializer] Users not fully seeded yet, waiting 2 s (attempt {}/5)…", attempt + 1);
            Thread.sleep(2_000);
        }
        return null;
    }

    @Override
    public void run(String... args) throws Exception {
        if (postsRepository.count() >= 9) return;

        Map<String, Long> U = resolveUsers();
        if (U == null) {
            log.warn("[DataInitializer] Could not resolve user IDs — skipping post seed");
            return;
        }

        long admin  = U.get("admin@example.com");
        long alex   = U.get("alex@example.com");
        long jordan = U.get("jordan@example.com");
        long priya  = U.get("priya@example.com");
        long jim    = U.get("jim@example.com");
        long maria  = U.get("maria@example.com");
        long fatima = U.get("fatima@example.com");
        long chen   = U.get("chen@example.com");
        long taylor = U.get("taylor@example.com");
        long owen   = U.get("owen@example.com");

        List<SeedPost> seedPosts = List.of(

            new SeedPost(alex,
                "[b]Just shipped our Kubernetes v1.30 ingress migration — zero downtime![/b]\n\n" +
                "Six months of planning, three weeks of execution. The key was using custom ArgoCD sync waves to sequence DB migrations before app rollouts. " +
                "Deprecating `networking.k8s.io/v1beta1` turned into a full Helm chart audit — found 14 stale templates along the way.\n\n" +
                "Biggest lesson: chaos test [color=teal]before[/color] you migrate, not after. We ran a 3-broker Kafka failure scenario the week prior and it revealed a DNS fallback loop that would've caused a 45-minute outage in prod. 📉 → 📈" +
                String.format(IMG, "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(jordan, "That DNS fallback loop finding is a lifesaver. We had a nearly identical issue in our GKE cluster last quarter."),
                    new SeedComment(priya, "The sync waves approach is exactly what we needed for our Postgres streaming scaling. Sending this to the whole platform team."),
                    new SeedComment(jim, "Would love to see the full ArgoCD wave configuration. We're about to do the same migration next sprint."),
                    new SeedComment(alex, "Happy to share! I'll post the full config in the Platform Labs Hub sphere.")
                )
            ),

            new SeedPost(priya,
                "AWS Lambda cold starts with 10GB ephemeral storage — [b]benchmark results[/b] 🔬\n\n" +
                "We streamed a 4.2GB zip bundle directly into /tmp instead of downloading from S3 on each invocation. Results after 10,000 cold starts:\n\n" +
                "• Cold start latency: +148ms average (acceptable)\n• Warm invocation: [color=green]-41% faster[/color] vs S3 download path\n• Cost: -23% due to fewer S3 API calls\n\n" +
                "The win is real. If you're processing large artifacts in Lambda, this pattern is now production-ready." +
                String.format(IMG, "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(jim, "The -41% warm latency improvement is massive. What's the memory allocation you're using alongside the 10GB /tmp?"),
                    new SeedComment(priya, "3,008 MB memory. We found that 2,048 MB wasn't enough for the decompression peak. The cost still comes out ahead."),
                    new SeedComment(maria, "This is exactly the data I needed to push this to our architecture review board. Sharing the benchmark now!")
                )
            ),

            new SeedPost(maria,
                "Hot take: your Prometheus scrape interval is lying to you about CI/CD performance 🚨\n\n" +
                "[b]The problem:[/b] A 15s scrape interval completely misses GitHub Actions runners that spin up and complete a job in under 8 seconds. You're flying blind on 40% of your runner cost.\n\n" +
                "[b]The fix:[/b] Pair Prometheus with a Vector push-based receiver that listens to GH webhook events. We saw [color=teal]3x more accurate[/color] cost attribution within 2 days of deploying it.\n\n" +
                "Dashboard screenshot below — the spike at 14:32 is a parallel matrix build that was completely invisible before 👇" +
                String.format(IMG, "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(owen, "We deployed Vector + webhook metrics last month and it changed everything. The GitHub Actions cost visibility alone justified the whole observability stack revamp."),
                    new SeedComment(chen, "The 8-second runner problem is real. We had a $6,000/month mystery charge that turned out to be matrix jobs that never showed in Grafana. Fixed it exactly this way."),
                    new SeedComment(jordan, "Bookmarking this. Our SRE lead has been asking for a business case to fund proper CI observability — this post is it.")
                )
            ),

            new SeedPost(taylor,
                "[b]Updated our entire Figma token library to support WCAG 2.2 AAA contrast. Here's what changed.[/b] ✨\n\n" +
                "We had 47 color pairs failing contrast at the AA level. After the audit:\n\n" +
                "• All text-on-surface pairs: [color=green]AAA certified[/color]\n• Dark mode palette rebuilt from scratch — no more faded mid-tones\n• Exported as CSS custom properties for zero-friction dev handoff\n\n" +
                "The design system now auto-validates contrast in Figma via a custom plugin that runs on every publish. No more accessibility regressions slipping through." +
                String.format(IMG, "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(alex, "The CSS custom property export is the real win here. Eliminates so much back-and-forth between design and engineering."),
                    new SeedComment(maria, "Which Figma plugin are you using for automated contrast validation? We need this badly."),
                    new SeedComment(taylor, "We built a custom one using the Figma Plugin API. Happy to open source it — will post a link once we clean it up.")
                )
            ),

            new SeedPost(fatima,
                "Chaos engineering principle of the week: [b]failure injection at the data plane, not just the control plane[/b] 🔥\n\n" +
                "Most teams run chaos at the infrastructure layer — killing pods, cutting network segments. But the most realistic failures happen in your data layer:\n\n" +
                "→ Kafka partition leadership election under load\n→ PostgreSQL replica lag exceeding your connection pool timeout\n→ Redis eviction under memory pressure during a traffic spike\n\n" +
                "We ran all three simultaneously last Tuesday in staging. The system's response exposed 2 undocumented dependencies that would've caused a 20-min customer-facing outage. Fixed before prod." +
                String.format(IMG, "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(chen, "The Redis eviction scenario is one I almost never see teams test. We got burned by it in 2023 — traffic spike + eviction = cascading auth failures. Never again."),
                    new SeedComment(jim, "Running all three simultaneously is bold. How do you isolate the failure signals to understand which dependency is the actual bottleneck?"),
                    new SeedComment(fatima, "We use structured logging with a chaos_experiment_id tag on every log line. Makes post-analysis in Loki dramatically easier.")
                )
            ),

            new SeedPost(jordan,
                "[b]Database sharding at 120M rows — here's the exact playbook we used[/b] 📊\n\n" +
                "After 18 months of exponential growth, our events table hit the point where single-instance PostgreSQL was no longer viable. We went with hash sharding on user_id using consistent hashing.\n\n" +
                "[b]The hard part nobody talks about:[/b] hot users. Power users generating 500x average write volume can saturate a shard. Our solution: a \"shard suffix\" strategy — appending a random 0-3 suffix to the shard key for users above a write rate threshold. Adds query complexity, but the shard balance is worth it.\n\n" +
                "Full migration runbook with rollback procedures linked in comments. Zero data loss, 4-hour maintenance window." +
                String.format(IMG, "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(priya, "The shard suffix approach for hot users is something I've never seen documented this clearly. This alone is worth sharing to the entire backend community."),
                    new SeedComment(chen, "How are you handling cross-shard aggregations for analytics? That's always the part that breaks beautiful sharding schemes."),
                    new SeedComment(jordan, "We routed analytics queries to a separate read replica with materialized views pre-aggregated per shard. The 15-minute lag is acceptable for dashboards.")
                )
            ),

            new SeedPost(jim,
                "Terraform v1.8 workspace strategy that actually scales — learned this the expensive way 💸\n\n" +
                "Monorepo workspaces sound great in demos. In production with 6 teams and 3 environments, they become an access control nightmare and a state locking bottleneck.\n\n" +
                "[b]What works:[/b] One state bucket per environment (dev/staging/prod), SSM Parameter Store for cross-state references, and per-team IAM boundaries enforced at the bucket policy level. Developer in the payments team cannot read the payments-staging state from their local machine — period.\n\n" +
                "Running this pattern for 8 months. State lock contention: [color=green]zero incidents[/color]." +
                String.format(IMG, "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(maria, "The IAM boundary at the bucket policy level is underrated. So much easier to audit and rotate than workspace-level RBAC."),
                    new SeedComment(alex, "We moved from monorepo workspaces to this exact pattern 6 months ago. The reduction in on-call pages related to state corruption is remarkable."),
                    new SeedComment(fatima, "How are you handling Terraform Cloud vs self-hosted for the state backend? We're debating whether TFC's remote runs are worth the cost.")
                )
            ),

            new SeedPost(chen,
                "gRPC vs REST for internal microservices — 6-month production data from 180-service mesh 📡\n\n" +
                "We migrated our top 12 high-throughput internal APIs from REST to gRPC in Q1. The numbers:\n\n" +
                "• P99 latency: [color=green]-62%[/color] for serialization-heavy routes\n• Payload size: [color=green]-71%[/color] (Protobuf vs JSON)\n• Error detection: [color=green]+40%[/color] via strict contract enforcement\n• Developer ramp-up: [color=teal]+3 weeks avg[/color] for teams new to Protobuf\n\n" +
                "The Connect protocol was the unexpected hero — gRPC-compatible but works over HTTP/1.1. Eliminated all our load balancer configuration headaches with zero performance penalty." +
                String.format(IMG, "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(priya, "The -62% P99 on serialization-heavy routes is the number I needed to convince our CTO. Thank you for the real data."),
                    new SeedComment(jordan, "The Connect protocol point is huge. We were blocked on gRPC adoption specifically because our AWS ALBs don't support HTTP/2 grpc-web. Connect solves it cleanly."),
                    new SeedComment(alex, "6 months of production data from 180 services is the most credible gRPC benchmark I've seen outside of Google. This is going into our architecture ADR immediately.")
                )
            ),

            new SeedPost(admin,
                "[b]CollabSphere just hit a major milestone — and we're growing fast.[/b] 🌍\n\n" +
                "This platform started as an idea: what if engineers, designers, and PMs had a space that respected their depth? No engagement-bait. No vanity metrics. Just real knowledge, real connections, real growth.\n\n" +
                "Today we have engineers discussing Kubernetes migrations. Designers pushing accessibility standards. PMs sharing sharding runbooks. And everyone learning from each other.\n\n" +
                "If you've found value here — share it with one person who belongs in this community. That's how we grow without losing what makes this place worth showing up to. 🙏" +
                String.format(IMG, "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=85&auto=format&fit=crop"),
                List.of(
                    new SeedComment(alex, "The quality of discussions in the Engineering sphere has already changed how my team approaches architecture decisions. Keep building this."),
                    new SeedComment(taylor, "Shared this with 3 design leads this morning. The Design Systems sphere alone is worth the account creation."),
                    new SeedComment(priya, "What I love most is that posts here link to real production data, not just thought leadership takes. Rare on any platform.")
                )
            )
        );

        for (SeedPost sp : seedPosts) {
            Post post = new Post();
            post.setUserId(sp.userId());
            post.setContent(sp.content());
            Post saved = postsRepository.save(post);

            for (SeedComment sc : sp.comments()) {
                PostComment comment = new PostComment();
                comment.setPostId(saved.getId());
                comment.setUserId(sc.userId());
                comment.setContent(sc.content());
                postCommentRepository.save(comment);
            }
        }

        log.info("[DataInitializer] Seeded {} posts with comments", seedPosts.size());
    }
}
