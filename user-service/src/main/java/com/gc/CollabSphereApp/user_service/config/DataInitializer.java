package com.gc.CollabSphereApp.user_service.config;

import com.gc.CollabSphereApp.user_service.entity.User;
import com.gc.CollabSphereApp.user_service.repository.UserRepository;
import com.gc.CollabSphereApp.user_service.utils.PasswordUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    @Value("${seed.default-password:}")
    private String seedPassword;

    private static final List<String[]> SEED_USERS = List.of(
        // { email, name, worksAt }
        new String[]{ "admin@example.com",   "Admin",         "CollabSphere" },
        new String[]{ "alex@example.com",    "Alex Morgan",   "Platform Labs" },
        new String[]{ "jordan@example.com",  "Jordan Lee",    "LaunchOps" },
        new String[]{ "priya@example.com",   "Priya Shah",    "CloudScale Inc" },
        new String[]{ "jim@example.com",     "Jim Patel",     "DevOps Ventures" },
        new String[]{ "maria@example.com",   "Maria Garcia",  "SRE Solutions" },
        new String[]{ "fatima@example.com",  "Fatima Khan",   "Chaos Systems" },
        new String[]{ "chen@example.com",    "Chen Wei",      "Reliability Co" },
        new String[]{ "taylor@example.com",  "Taylor Kim",    "DesignForge" },
        new String[]{ "owen@example.com",    "Owen Brooks",   "StreamTech" }
    );

    @Override
    public void run(String... args) {
        if (seedPassword == null || seedPassword.isBlank()) {
            log.info("[DataInitializer] SEED_DEFAULT_PASSWORD not set — skipping user seed");
            return;
        }
        String hashed = PasswordUtil.hashPassword(seedPassword);
        int created = 0;
        for (String[] u : SEED_USERS) {
            if (!userRepository.existsByEmail(u[0])) {
                User user = new User();
                user.setEmail(u[0]);
                user.setName(u[1]);
                user.setWorksAt(u[2]);
                user.setPassword(hashed);
                userRepository.save(user);
                created++;
                log.info("[DataInitializer] Created user: {}", u[0]);
            }
        }
        if (created > 0) log.info("[DataInitializer] Seeded {} user(s)", created);
    }
}
