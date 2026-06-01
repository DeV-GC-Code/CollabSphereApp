package com.gc.CollabSphereApp.connections_service.auth;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class UserInterceptorTest {

    private final FakeJwtService jwtService = new FakeJwtService();
    private final UserInterceptor interceptor = new UserInterceptor(jwtService);

    @AfterEach
    void clearContext() {
        UserContextHolder.clear();
    }

    @Test
    void rejectsSpoofedUserIdHeaderWithoutBearerToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Id", "99");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(UserContextHolder.getCurrentUserId()).isNull();
    }

    @Test
    void derivesCurrentUserFromBearerTokenAndIgnoresSpoofedUserIdHeader() throws Exception {
        jwtService.userId = 42L;
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer signed-token");
        request.addHeader("X-User-Id", "99");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
        assertThat(UserContextHolder.getCurrentUserId()).isEqualTo(42L);
    }

    private static class FakeJwtService extends JwtService {
        private Long userId;

        @Override
        public Long getUserIdFromToken(String token) {
            return userId;
        }
    }
}
