import { CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || ''
};

export const userPool = new CognitoUserPool(poolData);

export const cognitoConfig = {
  region: import.meta.env.VITE_COGNITO_REGION || 'us-west-2',
  userPoolId: poolData.UserPoolId,
  clientId: poolData.ClientId,
  domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
  redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin
};

