package com.gc.CollabSphereApp.posts_service.auth;

public class UserContextHolder {

    private static final ThreadLocal<Long> currentUserId = new ThreadLocal<>();
    private static final ThreadLocal<String> currentAuthorizationHeader = new ThreadLocal<>();


    public static Long getCurrentUserId() {
        return currentUserId.get();
    }

    public static String getCurrentAuthorizationHeader() {
        return currentAuthorizationHeader.get();
    }

    static void setCurrentUserId(Long userId) {
        currentUserId.set(userId);
    }

    static void setCurrentAuthorizationHeader(String authorizationHeader) {
        currentAuthorizationHeader.set(authorizationHeader);
    }

    //To avoid memory leakage
    static void clear(){
        currentUserId.remove();
        currentAuthorizationHeader.remove();
    }
}
