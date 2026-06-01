import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { Tag, CreateTagDto, UpdateTagDto } from "../types/tags.types";

export const getTags = async (): Promise<Tag[]> => {
    const { data } = await api.get<ApiResponse<Tag[]>>("/tags");
    return data.data!;
};

export const createTag = async (dto: CreateTagDto): Promise<Tag> => {
    const { data } = await api.post<ApiResponse<Tag>>("/tags", dto);
    return data.data!;
};

export const updateTag = async (id: string, dto: UpdateTagDto): Promise<Tag> => {
    const { data } = await api.put<ApiResponse<Tag>>(`/tags/${id}`, dto);
    return data.data!;
};

export const deleteTag = async (id: string): Promise<void> => {
    await api.delete(`/tags/${id}`);
};
