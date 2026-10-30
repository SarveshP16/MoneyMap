package com.moneymap.app;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.regex.Pattern;

/**
 * Reads notifications from the wallet and bank apps the user chose, and
 * queues the ones that mention an amount (a tap-to-pay receipt, a card
 * purchase alert) for review. Runs only while the user has granted
 * Notification access and turned capture on in MoneyMap; every other
 * notification is ignored without being stored.
 */
public class PaymentNotificationListener extends NotificationListenerService {
    /** Something that looks like money: digits with two decimal places. */
    private static final Pattern AMOUNT = Pattern.compile("\\d[\\d,]*\\.\\d{2}");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (!PaymentCaptureStore.isEnabled(this)) return;
        String packageName = sbn.getPackageName();
        if (!PaymentCaptureStore.watchedApps(this).contains(packageName)) return;

        Notification notification = sbn.getNotification();
        if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;

        Bundle extras = notification.extras;
        String title = text(extras, Notification.EXTRA_TITLE);
        String body = text(extras, Notification.EXTRA_BIG_TEXT);
        if (body.isEmpty()) body = text(extras, Notification.EXTRA_TEXT);
        if (!AMOUNT.matcher(title + " " + body).find()) return;

        try {
            JSONObject capture = new JSONObject();
            // The key plus the text, so an updated notification with a new amount counts as a new payment.
            capture.put("id", sbn.getKey() + "|" + (title + body).hashCode());
            capture.put("packageName", packageName);
            capture.put("appName", appLabel(packageName));
            capture.put("title", title);
            capture.put("text", body);
            capture.put("postedAt", sbn.getPostTime());
            if (PaymentCaptureStore.add(this, capture)) PaymentCapturePlugin.notifyChanged();
        } catch (JSONException ignored) {
            // malformed notification text; skip it
        }
    }

    private static String text(Bundle extras, String key) {
        CharSequence value = extras.getCharSequence(key);
        return value == null ? "" : value.toString().trim();
    }

    private String appLabel(String packageName) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            return pm.getApplicationLabel(info).toString();
        } catch (PackageManager.NameNotFoundException e) {
            return packageName;
        }
    }
}
