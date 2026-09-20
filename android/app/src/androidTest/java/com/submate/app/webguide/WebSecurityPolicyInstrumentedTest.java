package com.submate.app.webguide;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.net.Uri;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;

@RunWith(AndroidJUnit4.class)
public class WebSecurityPolicyInstrumentedTest {

    @Test
    public void allowsHttpsExactAndSubdomainOnly() {
        WebSecurityPolicy policy = new WebSecurityPolicy(
                Arrays.asList("netflix.com", "accounts.google.com"));

        assertTrue(policy.isAllowedHttpUrl(Uri.parse("https://netflix.com/account")));
        assertTrue(policy.isAllowedHttpUrl(Uri.parse("https://www.netflix.com/cancelplan")));
        assertTrue(policy.isAllowedHttpUrl(Uri.parse("https://accounts.google.com/signin")));

        assertFalse(policy.isAllowedHttpUrl(Uri.parse("http://www.netflix.com/cancelplan")));
        assertFalse(policy.isAllowedHttpUrl(Uri.parse("https://netflix.com.evil.example/cancel")));
        assertFalse(policy.isAllowedHttpUrl(Uri.parse("https://evil-netflix.com/cancel")));
    }
}
