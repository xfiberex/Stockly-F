import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getTags, createTag, updateTag, deleteTag } from "../api/tags.api";
import type { CreateTagDto, UpdateTagDto } from "../types/tags.types";

export const TAGS_KEY = ["tags"] as const;

export function useTags() {
    return useQuery({ queryKey: TAGS_KEY, queryFn: getTags });
}

export function useCreateTag() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTagDto) => createTag(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TAGS_KEY });
            toast.success("Etiqueta creada");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al crear la etiqueta"),
    });
}

export function useUpdateTag() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateTagDto }) => updateTag(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TAGS_KEY });
            toast.success("Etiqueta actualizada");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al actualizar la etiqueta"),
    });
}

export function useDeleteTag() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteTag(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TAGS_KEY });
            toast.success("Etiqueta eliminada");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al eliminar la etiqueta"),
    });
}
