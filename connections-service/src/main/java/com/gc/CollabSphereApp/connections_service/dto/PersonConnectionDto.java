package com.gc.CollabSphereApp.connections_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PersonConnectionDto {
    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String worksAt;
    private String status;
}
