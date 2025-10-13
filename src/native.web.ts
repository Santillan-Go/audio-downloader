// Web-compatible version of native functions
export async function downloadFile(
  _baseDir: string,
  relativePath: string,
  buffer: Buffer
) {
  // Create a blob and trigger browser download
  const blob = new Blob([new Uint8Array(buffer)], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = relativePath;
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function checkFileExists(
  _baseDir: string,
  _relativePath: string
): Promise<boolean> {
  // In web, we can't check file system, so always return false
  // This will always trigger fresh downloads
  return false;
}

export async function createPlaceholder(
  _baseDir: string,
  relativePath: string
) {
  // No-op in web version
  console.log(`Placeholder would be created: ${relativePath}`);
}

export async function writeSampleFile(
  baseDir: string,
  relativePath: string,
  buffer: Buffer
) {
  // Same as downloadFile for web
  return downloadFile(baseDir, relativePath, buffer);
}
