/**
 * Build-time safety net for the Android SPA build.
 *
 * The Arcane Guide's old "web realm only" guard was removed from the
 * source (guide.tsx no longer imports isNativeAds). This script exists
 * as a belt-and-braces check: if that string ever reappears anywhere in
 * src/, the Android build will still strip it.
 *
 * No-op when nothing matches.
 */
import * as fs from "fs";
import * as path from "path";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function patchStaleGuardStrings() {
  const srcDir = path.join(process.cwd(), "src");
  if (!fs.existsSync(srcDir)) return;

  for (const file of walk(srcDir)) {
    // NEVER touch the ads modules themselves — they legitimately import and
    // use isNativeAds/showNativeRewarded. Only guard the Guide's old block.
    if (file.endsWith("native-ads.ts") || file.endsWith("NativeAds.tsx")) continue;

    let content = fs.readFileSync(file, "utf8");
    let modified = false;

    if (content.includes("web realm only")) {
      content = content.replace(/web realm only/g, "mobile app ready");
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`Patched stale guard string in: ${file}`);
    }
  }
}

patchStaleGuardStrings();
