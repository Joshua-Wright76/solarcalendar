import dotenv from 'dotenv';

dotenv.config();

export const cognitoConfig = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  region: process.env.COGNITO_REGION || 'us-west-2',
  get issuer() {
    return `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
  },
  get jwksUri() {
    return `${this.issuer}/.well-known/jwks.json`;
  }
};

