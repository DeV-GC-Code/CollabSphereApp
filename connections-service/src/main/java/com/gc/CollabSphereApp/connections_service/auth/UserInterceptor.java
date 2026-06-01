package com.gc.CollabSphereApp.connections_service.auth;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class UserInterceptor implements HandlerInterceptor {

    private final JwtService jwtService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        UserContextHolder.clear();

        String tokenHeader = request.getHeader("Authorization");
        if(tokenHeader == null || !tokenHeader.startsWith("Bearer ")) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Authorization token required");
            return false;
        }

        try {
            UserContextHolder.setCurrentUserId(jwtService.getUserIdFromToken(tokenHeader.substring(7)));
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid or expired token");
            return false;
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        UserContextHolder.clear();
    }
}
