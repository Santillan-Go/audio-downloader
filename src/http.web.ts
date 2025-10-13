// Web-compatible HTTP client
export interface Response<T> {
  data: T;
}

export enum ResponseType {
  Binary = "arraybuffer",
}

export async function fetch<T>(
  url: string,
  options: {
    method: string;
    responseType?: ResponseType;
    body?: { type: "Json"; payload: any };
  }
): Promise<Response<T>> {
  // Convert Splice S3 URLs to use proxy to avoid CORS
  let proxyUrl = url;
  if (url.includes("spliceproduction.s3")) {
    // Handle both s3.amazonaws.com and s3.us-west-1.amazonaws.com patterns
    proxyUrl = url.replace(
      /https:\/\/spliceproduction\.s3[^\/]*\.amazonaws\.com/,
      "/api/s3"
    );
  }

  const fetchOptions: RequestInit = {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (options.body && options.body.type === "Json") {
    fetchOptions.body = JSON.stringify(options.body.payload);
  }

  const response = await window.fetch(proxyUrl, fetchOptions);

  let data: T;

  if (options.responseType === ResponseType.Binary) {
    data = (await response.arrayBuffer()) as T;
  } else {
    data = (await response.json()) as T;
  }

  return { data };
}
