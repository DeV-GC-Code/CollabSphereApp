package com.gc.CollabSphereApp.user_service.dto;

import lombok.Data;

/**
 * Public-safe user projection (signup response, directory, profile-by-id).
 * SEC-1: email is intentionally NOT exposed here — it is PII and was being
 * leaked via the (now auth-protected) list/by-id endpoints. The owner reads
 * their own email from the JWT claims, never from this DTO.
 */
@Data
public class UserDto {
    private Long id;
    private String name;
}
