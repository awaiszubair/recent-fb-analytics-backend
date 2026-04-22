export interface FacebookUserProfile {
  id: string;
  name?: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

export interface FacebookPage {
  id: string;
  name?: string;
  access_token?: string;
  fan_count?: number | string;
}

export interface FacebookPost {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  status_type?: string;
  type?: string;
  attachments?: {
    data?: Array<{
      media_type?: string;
      type?: string;
      media?: Record<string, unknown>;
    }>;
  };
  insights?: FacebookInsightsResponse;
}

export interface FacebookInsightValue {
  value: unknown;
  end_time?: string;
}

export interface FacebookInsightItem {
  name: string;
  period?: string;
  title?: string;
  description?: string;
  values?: FacebookInsightValue[];
}

export interface FacebookInsightsResponse {
  data: FacebookInsightItem[];
  paging?: {
    next?: string;
    previous?: string;
  };
}

export interface FacebookPostsResponse {
  data: FacebookPost[];
  paging?: {
    next?: string;
    previous?: string;
    cursors?: {
      before?: string;
      after?: string;
    };
  };
}

export interface FacebookBatchRequest {
  method: "GET" | "POST" | "DELETE";
  relative_url: string;
  name?: string;
}

export interface FacebookBatchResponse {
  code?: number;
  body?: string | Record<string, unknown>;
}

export interface GraphBatchResult<T = unknown> {
  success: boolean;
  pageId?: string;
  postId?: string;
  metrics?: string[];
  period?: string;
  data?: T;
  error?: unknown;
}
