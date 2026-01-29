export const getFullFileUrl = (path: string | undefined | null): string | undefined => {
  if (!path) return undefined;

  const decodedPath = decodeURIComponent(path);
  if (decodedPath.startsWith('http')) {
    return decodedPath;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  // Ensure we don't end up with double slashes if apiBase ends with /
  const normalizedApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const cleanPath = decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`;
  
  return `${normalizedApiBase}${cleanPath}`;
};
