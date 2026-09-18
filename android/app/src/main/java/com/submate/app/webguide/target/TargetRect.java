package com.submate.app.webguide.target;

public final class TargetRect {
    public final float leftCssPx;
    public final float topCssPx;
    public final float widthCssPx;
    public final float heightCssPx;
    public final float viewportWidthCssPx;
    public final float viewportHeightCssPx;

    public TargetRect(float leftCssPx, float topCssPx, float widthCssPx, float heightCssPx,
                      float viewportWidthCssPx, float viewportHeightCssPx) {
        this.leftCssPx = leftCssPx;
        this.topCssPx = topCssPx;
        this.widthCssPx = widthCssPx;
        this.heightCssPx = heightCssPx;
        this.viewportWidthCssPx = viewportWidthCssPx;
        this.viewportHeightCssPx = viewportHeightCssPx;
    }
}
