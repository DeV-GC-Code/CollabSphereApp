package com.gc.CollabSphereApp.connections_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConnectionRequestDto {
    private long senderId;
    private long receiverId;
}
