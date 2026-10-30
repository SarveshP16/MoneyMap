package com.moneymap.app;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Bridge between PaymentNotificationListener's queue and the web app (src/lib/paymentCapture.ts). */
@CapacitorPlugin(name = "PaymentCapture")
public class PaymentCapturePlugin extends Plugin {
    private static PaymentCapturePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
    }

    /** Coming back from the Notification access screen, or a payment made while the app was in the background. */
    @Override
    protected void handleOnResume() {
        notifyListeners("changed", new JSObject());
    }

    /** Called by the listener service when it queues a capture while the app is open. */
    static void notifyChanged() {
        PaymentCapturePlugin plugin = instance;
        if (plugin != null) plugin.notifyListeners("changed", new JSObject());
    }

    private boolean hasAccess() {
        return NotificationManagerCompat.getEnabledListenerPackages(getContext())
            .contains(getContext().getPackageName());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", PaymentCaptureStore.isEnabled(getContext()));
        result.put("hasAccess", hasAccess());
        call.resolve(result);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        PaymentCaptureStore.setEnabled(getContext(), enabled);
        // After an app update Android sometimes leaves the listener unbound until it's asked again.
        if (enabled && hasAccess()) {
            NotificationListenerService.requestRebind(
                new ComponentName(getContext(), PaymentNotificationListener.class));
        }
        call.resolve();
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    /** Where sideloaded installs unlock Notification access ("Allow restricted settings" in the ⋮ menu). */
    @PluginMethod
    public void openAppInfo(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject result = new JSObject();
        try {
            result.put("captures", new JSArray(PaymentCaptureStore.pending(getContext()).toString()));
        } catch (JSONException e) {
            result.put("captures", new JSArray());
        }
        call.resolve(result);
    }

    @PluginMethod
    public void acknowledge(PluginCall call) {
        PaymentCaptureStore.remove(getContext(), stringSet(call.getArray("ids")));
        call.resolve();
    }

    /** Launchable apps, so the user can pick their own bank if it isn't in the built-in list. */
    @PluginMethod
    public void listApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Intent launcher = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        Set<String> watched = PaymentCaptureStore.watchedApps(getContext());
        Set<String> added = new HashSet<>();
        List<JSObject> apps = new ArrayList<>();
        for (ResolveInfo info : pm.queryIntentActivities(launcher, 0)) {
            String packageName = info.activityInfo.packageName;
            if (packageName.equals(getContext().getPackageName()) || !added.add(packageName)) continue;
            JSObject app = new JSObject();
            app.put("packageName", packageName);
            app.put("label", info.loadLabel(pm).toString());
            app.put("watched", watched.contains(packageName));
            app.put("known", PaymentCaptureStore.KNOWN_APPS.contains(packageName));
            apps.add(app);
        }
        JSObject result = new JSObject();
        result.put("apps", new JSArray(apps));
        call.resolve(result);
    }

    @PluginMethod
    public void setWatchedApps(PluginCall call) {
        PaymentCaptureStore.setWatchedApps(getContext(), stringSet(call.getArray("packages")));
        call.resolve();
    }

    private static Set<String> stringSet(JSONArray arr) {
        Set<String> out = new HashSet<>();
        if (arr == null) return out;
        for (int i = 0; i < arr.length(); i++) {
            String value = arr.optString(i, null);
            if (value != null) out.add(value);
        }
        return out;
    }
}
