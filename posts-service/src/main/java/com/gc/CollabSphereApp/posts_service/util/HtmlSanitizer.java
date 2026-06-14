package com.gc.CollabSphereApp.posts_service.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

/**
 * SEC-3 — authoritative SERVER-SIDE sanitization of user-authored post HTML.
 *
 * The frontend sanitizes on render too, but the server must never trust the
 * client (a request can be crafted directly against the API). This is the
 * authoritative layer; the client sanitizer is defense-in-depth.
 *
 * Allow-list mirrors the composer's capabilities (basic formatting + a narrow
 * set of inline styles). Scripts, event handlers, links, images, iframes, and
 * unknown tags are stripped.
 *
 * Residual (documented in docs/security/hardening.md SEC-3): jsoup passes the
 * `style` attribute through without CSS-level sanitization. We allow it to
 * preserve the composer's colour/font features; modern browsers block
 * `javascript:` in CSS. To tighten, drop `style` or add a CSS allow-list.
 */
public final class HtmlSanitizer {

    private HtmlSanitizer() {
    }

    private static final Safelist SAFELIST = Safelist.none()
            .addTags("b", "strong", "i", "em", "u", "span", "br", "p", "div")
            .addAttributes("span", "style")
            .addAttributes("p", "style")
            .addAttributes("div", "style");

    /** Returns sanitized HTML, or the input unchanged when null. */
    public static String clean(String html) {
        if (html == null || html.isEmpty()) {
            return html;
        }
        return Jsoup.clean(html, SAFELIST);
    }
}
