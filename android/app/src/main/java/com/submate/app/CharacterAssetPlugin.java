package com.submate.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.submate.app.character.CharacterAssetManager;

@CapacitorPlugin(name = "CharacterAsset")
public class CharacterAssetPlugin extends Plugin {

    @PluginMethod
    public void getAsset(PluginCall call) {
        call.resolve(assetObject(CharacterAssetManager.getActiveAsset(getContext()), "READY"));
    }

    @PluginMethod
    public void pickPng(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/png");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, "handlePickResult");
    }

    @ActivityCallback
    private void handlePickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK
                || result.getData() == null || result.getData().getData() == null) {
            JSObject ret = new JSObject();
            ret.put("status", "CANCELLED");
            call.resolve(ret);
            return;
        }

        Uri uri = result.getData().getData();
        CharacterAssetManager.ValidationResult validation =
                CharacterAssetManager.stageFromUri(getContext(), uri);

        JSObject ret = new JSObject();
        if (!validation.valid) {
            ret.put("status", "INVALID");
            ret.put("code", validation.code);
            ret.put("message", validation.message);
            call.resolve(ret);
            return;
        }

        ret.put("status", "READY");
        ret.put("uri", Uri.fromFile(validation.file).toString());
        ret.put("width", validation.width);
        ret.put("height", validation.height);
        ret.put("sizeBytes", validation.sizeBytes);
        ret.put("hasAlpha", validation.hasAlpha);
        ret.put("updatedAt", validation.file.lastModified());
        call.resolve(ret);
    }

    @PluginMethod
    public void applyPending(PluginCall call) {
        try {
            CharacterAssetManager.AssetInfo info = CharacterAssetManager.applyPending(getContext());
            call.resolve(assetObject(info, "APPLIED"));
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("status", "ERROR");
            ret.put("message", "이미지를 적용하지 못했어요. 다시 시도해주세요.");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void discardPending(PluginCall call) {
        CharacterAssetManager.clearPending(getContext());
        JSObject ret = new JSObject();
        ret.put("status", "DISCARDED");
        call.resolve(ret);
    }

    @PluginMethod
    public void reset(PluginCall call) {
        CharacterAssetManager.reset(getContext());
        call.resolve(assetObject(CharacterAssetManager.getActiveAsset(getContext()), "RESET"));
    }

    private JSObject assetObject(CharacterAssetManager.AssetInfo info, String status) {
        JSObject ret = new JSObject();
        ret.put("status", status);
        ret.put("mode", info.mode);
        ret.put("hasCustom", CharacterAssetManager.MODE_CUSTOM.equals(info.mode));
        if (info.file != null) {
            ret.put("uri", Uri.fromFile(info.file).toString());
            ret.put("width", info.width);
            ret.put("height", info.height);
            ret.put("sizeBytes", info.sizeBytes);
            ret.put("hasAlpha", info.hasAlpha);
            ret.put("updatedAt", info.file.lastModified());
        }
        return ret;
    }
}
