export interface Tag {
    id: string;
    name: string;
    color: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTagDto {
    name: string;
    color?: string;
}

export interface UpdateTagDto {
    name?: string;
    color?: string;
}
