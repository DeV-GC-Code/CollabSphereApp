package com.gc.CollabSphereApp.posts_service.auth;

import feign.RequestInterceptor;
import feign.RequestTemplate;

public class FeignClientInterceptor implements RequestInterceptor {
    @Override
    public void apply(RequestTemplate requestTemplate) {
        Long userId = UserContextHolder.getCurrentUserId();
        if(userId!=null) {
            requestTemplate.header("X-User-Id", userId.toString());
        }
    }
}
