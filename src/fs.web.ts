// Web-compatible filesystem utilities
export async function exists(_path: string): Promise<boolean> {
  // In web, we can't check file existence
  return false;
}