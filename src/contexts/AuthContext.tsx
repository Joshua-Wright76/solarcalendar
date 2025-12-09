import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession
} from 'amazon-cognito-identity-js';
import { userPool, cognitoConfig } from '../config/cognito';

interface User {
  email: string;
  sub: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => void;
  signInWithGoogle: () => void;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getSession = useCallback((): Promise<CognitoUserSession | null> => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return Promise.resolve(null);

    return new Promise((resolve) => {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) {
          resolve(null);
        } else {
          resolve(session);
        }
      });
    });
  }, []);

  const extractUserFromSession = (session: CognitoUserSession): User => {
    const idToken = session.getIdToken();
    return {
      email: idToken.payload.email as string,
      sub: idToken.payload.sub as string
    };
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          setUser(extractUserFromSession(session));
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Exchange code for tokens (handled by Cognito hosted UI redirect)
      handleOAuthCallback();
    } else {
      checkSession();
    }
  }, [getSession]);

  const handleOAuthCallback = async () => {
    // The Cognito hosted UI will set cookies/storage with the session
    // We need to wait a moment for the session to be available
    setTimeout(async () => {
      const session = await getSession();
      if (session) {
        setUser(extractUserFromSession(session));
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsLoading(false);
    }, 100);
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool
    });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password
    });

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          setUser(extractUserFromSession(session));
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
        newPasswordRequired: () => {
          reject(new Error('New password required'));
        }
      });
    });
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email })
    ];

    return new Promise((resolve, reject) => {
      userPool.signUp(email, password, attributeList, [], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  const confirmSignUp = async (email: string, code: string): Promise<void> => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  const signOut = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    setUser(null);
  };

  const signInWithGoogle = () => {
    const { domain, clientId, redirectUri } = cognitoConfig;
    const googleAuthUrl = `https://${domain}/oauth2/authorize?` +
      `identity_provider=Google&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `scope=email+openid+profile`;
    
    window.location.href = googleAuthUrl;
  };

  const getIdToken = async (): Promise<string | null> => {
    const session = await getSession();
    return session?.getIdToken().getJwtToken() || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
        signInWithGoogle,
        getIdToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

