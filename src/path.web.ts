// Web-compatible path utilities
export const path = {
  async join(...segments: string[]): Promise<string> {
    return segments.join('/');
  }
};

// Get Downloads folder for web (returns empty since we can't access file system)
export async function downloadDir(): Promise<string> {
  return ""; // In web, we use browser downloads instead
}