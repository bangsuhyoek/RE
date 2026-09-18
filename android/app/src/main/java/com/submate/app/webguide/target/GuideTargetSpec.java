package com.submate.app.webguide.target;

public final class GuideTargetSpec {
    private final String selector;
    private final String elementId;
    private final String className;
    private final String text;
    private final String ariaLabel;
    private final String role;
    private final String hrefContains;
    private final String dataAttributeName;
    private final String dataAttributeValue;

    public GuideTargetSpec(
            String selector,
            String elementId,
            String className,
            String text,
            String ariaLabel,
            String role,
            String hrefContains,
            String dataAttributeName,
            String dataAttributeValue
    ) {
        this.selector = clean(selector);
        this.elementId = clean(elementId);
        this.className = clean(className);
        this.text = clean(text);
        this.ariaLabel = clean(ariaLabel);
        this.role = clean(role);
        this.hrefContains = clean(hrefContains);
        this.dataAttributeName = clean(dataAttributeName);
        this.dataAttributeValue = clean(dataAttributeValue);
    }

    public static GuideTargetSpec forText(String text) {
        return new GuideTargetSpec(null, null, null, text, null, null, null, null, null);
    }

    private static String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public String getSelector() { return selector; }
    public String getElementId() { return elementId; }
    public String getClassName() { return className; }
    public String getText() { return text; }
    public String getAriaLabel() { return ariaLabel; }
    public String getRole() { return role; }
    public String getHrefContains() { return hrefContains; }
    public String getDataAttributeName() { return dataAttributeName; }
    public String getDataAttributeValue() { return dataAttributeValue; }
}
