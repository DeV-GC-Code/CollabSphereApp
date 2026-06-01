package com.gc.CollabSphereApp.posts_service.auth;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.stereotype.Component;

@Component
public class FeignClientInterceptor implements RequestInterceptor {
    @Override
    public void apply(RequestTemplate requestTemplate) {
        String authorizationHeader = UserContextHolder.getCurrentAuthorizationHeader();
        if(authorizationHeader != null) {
            requestTemplate.header("Authorization", authorizationHeader);
        }
    }
}
