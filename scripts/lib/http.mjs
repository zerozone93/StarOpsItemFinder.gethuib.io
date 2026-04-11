const DEFAULT_TIMEOUT_MS = 30000;

function withTimeout(options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = options;
  if (signal) {
    return { ...rest, signal };
  }
  return { ...rest, signal: AbortSignal.timeout(timeoutMs) };
}

export async function getJson(url, options = {}) {
  const requestOptions = withTimeout(options);
  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      "accept": "application/json",
      ...(requestOptions.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

export async function getText(url, options = {}) {
  const requestOptions = withTimeout(options);
  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      "accept": "text/plain, text/html, application/json",
      ...(requestOptions.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

export const fetchText = getText;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}