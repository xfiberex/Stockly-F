// login devuelve esto (no el User completo):
export interface AuthLoginData {
    id: string;
    email: string;
    name: string;
}

// PUT /auth/me devuelve:
export interface UpdateProfileResponse {
    emailChanged: boolean;
    message: string;
}

// PATCH /auth/me/password devuelve:
export interface UpdatePasswordResponse {
    passwordChanged: boolean;
    message: string;
}
