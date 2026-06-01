package com.gc.CollabSphereApp.connections_service.exception;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApiError {
    private int status;
    private String message;
}
