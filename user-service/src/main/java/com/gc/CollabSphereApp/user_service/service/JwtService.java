package com.gc.CollabSphereApp.user_service.service;

import com.gc.CollabSphereApp.user_service.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secretKey}")
    private String jwtSecretKey;

    // SEC-4: access-token lifetime is config-driven (default 24h). Keep it short
    // in production and pair with refresh tokens (see docs/security/hardening.md).
    @Value("${jwt.accessTokenExpirationMs:86400000}")
    private long accessTokenExpirationMs;

    // RBAC: admin is determined centrally at the issuer and emitted as a signed `role`
    // claim — downstream services trust the claim instead of comparing emails themselves.
    // (Email *verification* is a separate, still-deferred feature; see hardening.md.)
    @Value("${app.admin-emails:${ADMIN_EMAIL:admin@example.com}}")
    private String adminEmails;

    private String roleFor(User user) {
        if (user.getEmail() == null) return "USER";
        for (String e : adminEmails.split(",")) {
            if (e.trim().equalsIgnoreCase(user.getEmail().trim())) return "ADMIN";
        }
        return "USER";
    }

    private SecretKey getSecretKey() {
        // SEC-4: HS256 needs a >= 256-bit (32-byte) secret. Fail fast on a weak
        // secret rather than minting forgeable tokens with a short key.
        byte[] keyBytes = (jwtSecretKey != null) ? jwtSecretKey.getBytes(StandardCharsets.UTF_8) : new byte[0];
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "jwt.secretKey must be at least 32 bytes (256-bit) for HS256. "
                            + "Set a strong ${secret}. See docs/security/hardening.md (SEC-4).");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(User user) {
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .claim("worksAt", user.getWorksAt())
                .claim("role", roleFor(user))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpirationMs))
                .signWith(getSecretKey())
                .compact();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSecretKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.valueOf(claims.getSubject());
    }

}
