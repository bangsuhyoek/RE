package com.submate.app.character;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.widget.ImageView;

import com.submate.app.R;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.EOFException;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

public final class CharacterAssetManager {
    public static final String MODE_DEFAULT = "DEFAULT";
    public static final String MODE_CUSTOM = "CUSTOM";

    private static final String PREFS = "kkudok_character_asset";
    private static final String MASTER_ASSET_PATH = "public/assets/kkudok/character_master.png";
    private static final String KEY_MODE = "mode";
    private static final String DIR_NAME = "character";
    private static final String CUSTOM_FILE = "custom_character.png";
    private static final String PENDING_FILE = "pending_character.png";
    private static final long MAX_BYTES = 5L * 1024L * 1024L;
    private static final int MIN_DIMENSION = 256;
    private static final int MAX_DIMENSION = 2048;
    private static final double MIN_ASPECT = 0.5d;
    private static final double MAX_ASPECT = 2.0d;
    private static final byte[] PNG_SIGNATURE = new byte[] {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    };

    private CharacterAssetManager() {}

    public static final class AssetInfo {
        public final String mode;
        public final File file;
        public final int width;
        public final int height;
        public final long sizeBytes;
        public final boolean hasAlpha;

        AssetInfo(String mode, File file, int width, int height, long sizeBytes, boolean hasAlpha) {
            this.mode = mode;
            this.file = file;
            this.width = width;
            this.height = height;
            this.sizeBytes = sizeBytes;
            this.hasAlpha = hasAlpha;
        }
    }

    public static final class ValidationResult {
        public final boolean valid;
        public final String code;
        public final String message;
        public final File file;
        public final int width;
        public final int height;
        public final long sizeBytes;
        public final boolean hasAlpha;

        private ValidationResult(
                boolean valid,
                String code,
                String message,
                File file,
                int width,
                int height,
                long sizeBytes,
                boolean hasAlpha
        ) {
            this.valid = valid;
            this.code = code;
            this.message = message;
            this.file = file;
            this.width = width;
            this.height = height;
            this.sizeBytes = sizeBytes;
            this.hasAlpha = hasAlpha;
        }

        static ValidationResult ok(File file, int width, int height, long sizeBytes, boolean hasAlpha) {
            return new ValidationResult(true, "OK", "", file, width, height, sizeBytes, hasAlpha);
        }

        static ValidationResult fail(String code, String message) {
            return new ValidationResult(false, code, message, null, 0, 0, 0L, false);
        }
    }

    public static ValidationResult stageFromUri(Context context, Uri uri) {
        clearPending(context);
        if (uri == null) return ValidationResult.fail("NO_FILE", invalidMessage());

        String displayName = getDisplayName(context, uri);
        if (displayName != null && !displayName.toLowerCase().endsWith(".png")) {
            return ValidationResult.fail("NOT_PNG", invalidMessage());
        }

        File dir = ensureDirectory(context.getCacheDir());
        File pending = new File(dir, PENDING_FILE);
        long total = 0L;

        try (InputStream raw = context.getContentResolver().openInputStream(uri);
             BufferedInputStream in = raw == null ? null : new BufferedInputStream(raw);
             BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(pending))) {
            if (in == null) {
                return ValidationResult.fail("READ_FAILED", invalidMessage());
            }
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > MAX_BYTES) {
                    deleteQuietly(pending);
                    return ValidationResult.fail("TOO_LARGE", invalidMessage());
                }
                out.write(buffer, 0, read);
            }
        } catch (Exception e) {
            deleteQuietly(pending);
            return ValidationResult.fail("READ_FAILED", invalidMessage());
        }

        ValidationResult result = validateFile(pending);
        if (!result.valid) deleteQuietly(pending);
        return result;
    }

    public static ValidationResult validateFile(File file) {
        if (file == null || !file.isFile() || file.length() <= 0 || file.length() > MAX_BYTES) {
            return ValidationResult.fail("SIZE_INVALID", invalidMessage());
        }

        try {
            if (!hasPngSignature(file)) {
                return ValidationResult.fail("NOT_PNG", invalidMessage());
            }
            if (containsApngChunk(file)) {
                return ValidationResult.fail("APNG_NOT_SUPPORTED", "움직이는 PNG는 사용할 수 없어요. 일반 PNG 파일을 선택해주세요.");
            }
        } catch (IOException e) {
            return ValidationResult.fail("CORRUPTED", invalidMessage());
        }

        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);
        int width = bounds.outWidth;
        int height = bounds.outHeight;
        if (width < MIN_DIMENSION || height < MIN_DIMENSION
                || width > MAX_DIMENSION || height > MAX_DIMENSION) {
            return ValidationResult.fail(
                    "DIMENSION_INVALID",
                    "256~2048px 범위의 PNG 이미지를 선택해주세요.");
        }

        double aspect = width / (double) height;
        if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
            return ValidationResult.fail(
                    "ASPECT_INVALID",
                    "너무 길거나 넓은 이미지는 사용할 수 없어요.");
        }

        Bitmap bitmap = null;
        try {
            bitmap = BitmapFactory.decodeFile(file.getAbsolutePath());
            if (bitmap == null) {
                return ValidationResult.fail("CORRUPTED", invalidMessage());
            }
            return ValidationResult.ok(
                    file,
                    width,
                    height,
                    file.length(),
                    bitmap.hasAlpha()
            );
        } catch (Throwable t) {
            return ValidationResult.fail("CORRUPTED", invalidMessage());
        } finally {
            if (bitmap != null) bitmap.recycle();
        }
    }

    public static AssetInfo applyPending(Context context) throws IOException {
        clearPending(context);
        throw new IOException("꾸독 캐릭터는 공식 캐릭터 1종으로 고정되어 있습니다.");
    }

    public static AssetInfo getActiveAsset(Context context) {
        return new AssetInfo(MODE_DEFAULT, null, 0, 0, 0L, true);
    }

    public static void reset(Context context) {
        deleteQuietly(getCustomFile(context));
        clearPending(context);
        prefs(context).edit().putString(KEY_MODE, MODE_DEFAULT).apply();
    }

    public static void clearPending(Context context) {
        deleteQuietly(getPendingFile(context));
    }

    public static File getPendingFile(Context context) {
        return new File(ensureDirectory(context.getCacheDir()), PENDING_FILE);
    }

    public static void applyToImageView(Context context, ImageView view) {
        if (view == null) return;
        try (InputStream in = context.getAssets().open(MASTER_ASSET_PATH)) {
            Bitmap bitmap = BitmapFactory.decodeStream(in);
            if (bitmap != null) {
                view.setImageBitmap(bitmap);
                return;
            }
        } catch (Exception ignored) {
        }
        // Never fall back to a legacy character variant.
        view.setImageDrawable(null);
    }

    public static String invalidMessage() {
        return "이 이미지는 사용할 수 없어요. 5MB 이하의 PNG 파일을 선택해주세요.";
    }

    private static AssetInfo describeFile(String mode, File file) {
        ValidationResult result = validateFile(file);
        if (!result.valid) return null;
        return new AssetInfo(
                mode,
                file,
                result.width,
                result.height,
                result.sizeBytes,
                result.hasAlpha
        );
    }

    private static File getCustomFile(Context context) {
        return new File(ensureDirectory(context.getFilesDir()), CUSTOM_FILE);
    }

    private static File ensureDirectory(File base) {
        File dir = new File(base, DIR_NAME);
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String getDisplayName(Context context, Uri uri) {
        try (android.database.Cursor cursor = context.getContentResolver().query(
                uri,
                new String[] { OpenableColumns.DISPLAY_NAME },
                null,
                null,
                null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static boolean hasPngSignature(File file) throws IOException {
        byte[] signature = new byte[PNG_SIGNATURE.length];
        try (InputStream in = new FileInputStream(file)) {
            int offset = 0;
            while (offset < signature.length) {
                int read = in.read(signature, offset, signature.length - offset);
                if (read < 0) return false;
                offset += read;
            }
        }
        return Arrays.equals(signature, PNG_SIGNATURE);
    }

    private static boolean containsApngChunk(File file) throws IOException {
        try (DataInputStream in = new DataInputStream(new BufferedInputStream(new FileInputStream(file)))) {
            byte[] signature = new byte[8];
            in.readFully(signature);
            if (!Arrays.equals(signature, PNG_SIGNATURE)) return false;

            while (true) {
                long length;
                try {
                    length = Integer.toUnsignedLong(in.readInt());
                } catch (EOFException eof) {
                    return false;
                }
                byte[] type = new byte[4];
                in.readFully(type);
                String chunkType = new String(type, java.nio.charset.StandardCharsets.US_ASCII);
                if ("acTL".equals(chunkType)) return true;
                if (length > file.length()) throw new IOException("Invalid PNG chunk");
                skipFully(in, length + 4L);
                if ("IEND".equals(chunkType)) return false;
            }
        }
    }

    private static void skipFully(InputStream in, long bytes) throws IOException {
        long remaining = bytes;
        while (remaining > 0) {
            long skipped = in.skip(remaining);
            if (skipped > 0) {
                remaining -= skipped;
                continue;
            }
            if (in.read() == -1) throw new EOFException();
            remaining--;
        }
    }

    private static void copyFile(File source, File target) throws IOException {
        try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(source));
             BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(target))) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
        }
    }

    private static void deleteQuietly(File file) {
        if (file != null && file.exists()) {
            try {
                file.delete();
            } catch (Exception ignored) {}
        }
    }
}
