package com.moneymap.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Device-local queue of payment notifications waiting for review in the app,
 * plus the capture settings (on/off, which apps to watch). Raw text only:
 * parsing the amount and merchant happens in the web layer
 * (src/lib/paymentCapture.ts) so it can change without a native rebuild.
 */
final class PaymentCaptureStore {
    private static final String PREFS = "payment_capture";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_WATCHED = "watched";
    private static final String KEY_PENDING = "pending";
    private static final String KEY_SEEN = "seen";
    private static final int MAX_PENDING = 100;
    private static final int MAX_SEEN = 300;

    /** Wallets and Australian banks watched until the user picks their own list. */
    static final Set<String> KNOWN_APPS = new HashSet<>(Arrays.asList(
        "com.google.android.apps.walletnfcrel", // Google Wallet
        "com.samsung.android.spay",             // Samsung Wallet
        "com.commbank.netbank",                 // CommBank
        "com.anz.android.gomoney",              // ANZ
        "au.com.nab.mobile",                    // NAB
        "org.westpac.bank",                     // Westpac
        "org.stgeorge.bank",                    // St.George
        "org.banksa.bank",                      // BankSA
        "org.bom.bank",                         // Bank of Melbourne
        "au.com.ing.banking",                   // ING
        "au.com.macquarie.banking",             // Macquarie
        "au.com.up.money",                      // Up
        "com.revolut.revolut",                  // Revolut
        "com.transferwise.android"              // Wise
    ));

    private PaymentCaptureStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isEnabled(Context context) {
        return prefs(context).getBoolean(KEY_ENABLED, false);
    }

    static void setEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply();
    }

    static Set<String> watchedApps(Context context) {
        Set<String> stored = prefs(context).getStringSet(KEY_WATCHED, null);
        return stored != null ? new HashSet<>(stored) : new HashSet<>(KNOWN_APPS);
    }

    static void setWatchedApps(Context context, Set<String> packages) {
        prefs(context).edit().putStringSet(KEY_WATCHED, new HashSet<>(packages)).apply();
    }

    /** Queues a capture unless one with the same id was already queued or reviewed. */
    static synchronized boolean add(Context context, JSONObject capture) {
        try {
            String id = capture.getString("id");
            Set<String> seen = readSeen(context);
            if (seen.contains(id)) return false;
            seen.add(id);

            JSONArray pending = readPending(context);
            pending.put(capture);
            while (pending.length() > MAX_PENDING) pending.remove(0);

            prefs(context).edit()
                .putString(KEY_PENDING, pending.toString())
                .putString(KEY_SEEN, trimmedSeen(seen).toString())
                .apply();
            return true;
        } catch (JSONException e) {
            return false;
        }
    }

    static synchronized JSONArray pending(Context context) {
        return readPending(context);
    }

    /** Drops reviewed captures from the queue; they stay in "seen" so a re-posted notification isn't queued again. */
    static synchronized void remove(Context context, Set<String> ids) {
        JSONArray pending = readPending(context);
        JSONArray kept = new JSONArray();
        for (int i = 0; i < pending.length(); i++) {
            JSONObject item = pending.optJSONObject(i);
            if (item != null && !ids.contains(item.optString("id"))) kept.put(item);
        }
        prefs(context).edit().putString(KEY_PENDING, kept.toString()).apply();
    }

    private static JSONArray readPending(Context context) {
        try {
            return new JSONArray(prefs(context).getString(KEY_PENDING, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static Set<String> readSeen(Context context) {
        Set<String> seen = new LinkedHashSet<>();
        try {
            JSONArray arr = new JSONArray(prefs(context).getString(KEY_SEEN, "[]"));
            for (int i = 0; i < arr.length(); i++) seen.add(arr.getString(i));
        } catch (JSONException ignored) {
            // start over
        }
        return seen;
    }

    private static JSONArray trimmedSeen(Set<String> seen) {
        JSONArray arr = new JSONArray();
        int skip = Math.max(0, seen.size() - MAX_SEEN);
        for (String id : seen) {
            if (skip-- > 0) continue;
            arr.put(id);
        }
        return arr;
    }
}
