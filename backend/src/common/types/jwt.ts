export type JwtType = 'access_token' | 'refresh_token';

export interface CreateJwtInterface {
  jti: string;
  sub: string;
  // session_id: string
  email: string;
  email_verified: boolean;
  phone: string;
  phone_verified: boolean;
  type: JwtType;
  count?: number;
  refresh_jti?: string;
  refresh_exp?: number;
  role: string;
}

export interface JwtInterface extends CreateJwtInterface {
  iat: number;
  exp: number;
  iss: string;
  audience: string;
}
