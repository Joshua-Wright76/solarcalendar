const API_BASE = '/api';

export interface UserProfile {
  id: number;
  cognito_sub: string;
  email: string;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchWithAuth(
  url: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

export async function getProfile(getToken: () => Promise<string | null>): Promise<UserProfile | null> {
  const response = await fetchWithAuth('/profile', getToken);
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  
  return response.json();
}

export async function createOrUpdateProfile(
  getToken: () => Promise<string | null>,
  birthday?: string
): Promise<UserProfile> {
  const response = await fetchWithAuth('/profile', getToken, {
    method: 'POST',
    body: JSON.stringify({ birthday })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create/update profile');
  }
  
  return response.json();
}

export async function updateBirthday(
  getToken: () => Promise<string | null>,
  birthday: string
): Promise<UserProfile> {
  const response = await fetchWithAuth('/profile', getToken, {
    method: 'PUT',
    body: JSON.stringify({ birthday })
  });
  
  if (!response.ok) {
    throw new Error('Failed to update birthday');
  }
  
  return response.json();
}

