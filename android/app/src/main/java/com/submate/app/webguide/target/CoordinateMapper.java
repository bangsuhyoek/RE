package com.submate.app.webguide.target;

import android.graphics.RectF;
import android.view.View;
import android.webkit.WebView;

public final class CoordinateMapper {
    private CoordinateMapper() {}

    /**
     * Maps getBoundingClientRect() CSS viewport coordinates into a native overlay coordinate system.
     * getBoundingClientRect() is already viewport-relative, so scroll offsets are intentionally not added.
     * devicePixelRatio is also intentionally not multiplied separately; the viewport-to-WebView scale
     * below already converts CSS pixels to the WebView's native pixel dimensions.
     */
    public static RectF toOverlayRect(WebView webView, View overlayView, TargetRect rect) {
        if (webView == null || overlayView == null || rect == null
                || rect.viewportWidthCssPx <= 0 || rect.viewportHeightCssPx <= 0
                || webView.getWidth() <= 0 || webView.getHeight() <= 0) {
            return null;
        }

        float scaleX = webView.getWidth() / rect.viewportWidthCssPx;
        float scaleY = webView.getHeight() / rect.viewportHeightCssPx;

        int[] webLocation = new int[2];
        int[] overlayLocation = new int[2];
        webView.getLocationInWindow(webLocation);
        overlayView.getLocationInWindow(overlayLocation);

        float offsetX = webLocation[0] - overlayLocation[0];
        float offsetY = webLocation[1] - overlayLocation[1];

        return new RectF(
                offsetX + rect.leftCssPx * scaleX,
                offsetY + rect.topCssPx * scaleY,
                offsetX + (rect.leftCssPx + rect.widthCssPx) * scaleX,
                offsetY + (rect.topCssPx + rect.heightCssPx) * scaleY
        );
    }

    public static RectF toOverlayRect(WebView webView, TargetRect rect) {
        return toOverlayRect(webView, webView, rect);
    }
}
