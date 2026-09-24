// Hands a generated file (backup JSON, income PDF) to the user. In a
// browser that's an <a download> click; inside the Android app's WebView
// downloads go nowhere, so the file is written to the app's cache and
// opened in the system share sheet instead — save to Drive/Files, email
// it, whatever the phone offers.

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file data.'));
    reader.readAsDataURL(blob);
  });
}

export async function saveFile(filename: string, blob: Blob): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    });
    try {
      await Share.share({ title: filename, files: [uri] });
    } catch (err) {
      // Backing out of the share sheet isn't a failure worth surfacing.
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      throw err;
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Must be in the DOM for .click() to reliably trigger a download in every
  // browser, and the object URL must outlive the click — revoking it
  // synchronously races the browser actually reading the blob and can
  // silently drop the download.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
