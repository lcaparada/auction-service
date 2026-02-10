import jwt from 'jsonwebtoken';

export type AuthorizerEvent = {
  type: 'REQUEST';
  methodArn: string;
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string> | null;
};

type PolicyStatement = {
  Action: string;
  Effect: 'Allow' | 'Deny';
  Resource: string;
};

type PolicyDocument = {
  Version: string;
  Statement: PolicyStatement[];
};

export type AuthorizerResult = {
  principalId: string;
  policyDocument: PolicyDocument;
  context?: Record<string, string>;
};

type JwtPayload = {
  sub?: string;
  userId?: string;
  [key: string]: unknown;
};

const getToken = (event: AuthorizerEvent): string | null => {
  const auth = event.headers?.Authorization ?? event.headers?.authorization;
  if (!auth || typeof auth !== 'string') return null;
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
};

const denyPolicy = (methodArn: string, principalId: string): AuthorizerResult => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: 'Deny',
        Resource: methodArn,
      },
    ],
  },
});

const allowPolicy = (
  methodArn: string,
  principalId: string,
  context: Record<string, string>
): AuthorizerResult => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: methodArn,
      },
    ],
  },
  context,
});

export const handler = async (event: AuthorizerEvent): Promise<AuthorizerResult> => {
  const token = getToken(event);

  if (!token) {
    return denyPolicy(event.methodArn, 'anonymous');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return denyPolicy(event.methodArn, 'anonymous');
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    const userId = payload.sub ?? payload.userId ?? payload;
    const userIdStr = typeof userId === 'string' ? userId : String(userId);
    return allowPolicy(event.methodArn, userIdStr, {
      userId: userIdStr,
    });
  } catch {
    return denyPolicy(event.methodArn, 'anonymous');
  }
};
