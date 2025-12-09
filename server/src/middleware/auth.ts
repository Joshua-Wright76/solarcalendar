import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { cognitoConfig } from '../config/cognito.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
  };
}

const client = jwksClient({
  jwksUri: cognitoConfig.jwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  jwt.verify(
    token,
    getKey,
    {
      issuer: cognitoConfig.issuer,
      algorithms: ['RS256']
    },
    (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
      }

      const payload = decoded as jwt.JwtPayload;
      
      // Verify token_use is 'id' or 'access'
      if (payload.token_use !== 'id' && payload.token_use !== 'access') {
        return res.status(401).json({ error: 'Invalid token type' });
      }

      req.user = {
        sub: payload.sub as string,
        email: payload.email as string
      };

      next();
    }
  );
}

